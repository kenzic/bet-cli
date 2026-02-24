import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getConfigPath } from "./config.js";

const CRON_MARKER = "# bet:update";
const WRAPPER_SCRIPT_NAME = "bet-update-cron.sh";
const LOG_FILE_NAME = "cron-update.log";

const SCHEDULE_REGEX = /^(\d+)(m|h|d)$/i;

export type CronScheduleUnit = "m" | "h" | "d";

export type ParsedCronSchedule = {
  value: number;
  unit: CronScheduleUnit;
};

const MINUTES_MIN = 1;
const MINUTES_MAX = 59;
const HOURS_MIN = 1;
const HOURS_MAX = 24;
const DAYS_MIN = 1;
const DAYS_MAX = 31;

/**
 * Parses a schedule string (e.g. "5m", "2h", "7d") and validates ranges.
 * @throws Error if format is invalid or value is out of range (m: 1-59, h: 1-24, d: 1-31).
 */
export function parseCronSchedule(schedule: string): ParsedCronSchedule {
  const trimmed = schedule.trim().toLowerCase();
  const match = trimmed.match(SCHEDULE_REGEX);
  if (!match) {
    throw new Error(
      `Invalid cron schedule "${schedule}". Use Nm (1-59), Nh (1-24), or Nd (1-31). Examples: 5m, 1h, 7d. Use 0 or false to disable.`,
    );
  }
  const value = parseInt(match[1], 10);
  const unit = match[2] as CronScheduleUnit;

  if (unit === "m" && (value < MINUTES_MIN || value > MINUTES_MAX)) {
    throw new Error(
      `Invalid minutes: ${value}. Use 1-59 for Nm (e.g. 5m, 30m).`,
    );
  }
  if (unit === "h" && (value < HOURS_MIN || value > HOURS_MAX)) {
    throw new Error(
      `Invalid hours: ${value}. Use 1-24 for Nh (e.g. 1h, 12h). Use 24h for once per day.`,
    );
  }
  if (unit === "d" && (value < DAYS_MIN || value > DAYS_MAX)) {
    throw new Error(
      `Invalid days: ${value}. Use 1-31 for Nd (e.g. 1d, 7d).`,
    );
  }

  return { value, unit };
}

/**
 * Converts a parsed schedule to a 5-field cron expression (minute hour dom month dow).
 */
export function scheduleToCronExpression(parsed: ParsedCronSchedule): string {
  const { value, unit } = parsed;
  if (unit === "m") {
    return `*/${value} * * * *`;
  }
  if (unit === "h") {
    if (value === 24) {
      return "0 0 * * *";
    }
    return `0 */${value} * * *`;
  }
  // unit === "d"
  return `0 0 */${value} * *`;
}

export type InstallUpdateCronOptions = {
  /** Absolute path to the Node binary (e.g. process.execPath). */
  nodePath: string;
  /** Absolute path to the bet CLI entry script (e.g. dist/index.js). */
  entryScriptPath: string;
  /** Schedule string: Nm (1-59), Nh (1-24), Nd (1-31). Example: "5m", "1h", "7d". */
  schedule: string;
};

/**
 * Writes a wrapper script and installs/updates a per-user crontab entry
 * so that `bet update` runs at the given schedule. Idempotent: re-running
 * replaces the existing bet cron block (single cron only).
 * @throws Error if schedule is invalid (see parseCronSchedule).
 * @returns Paths to the wrapper script and log file for user reference.
 */
export async function installUpdateCron(
  options: InstallUpdateCronOptions,
): Promise<{ wrapperPath: string; logPath: string }> {
  const { nodePath, entryScriptPath, schedule } = options;
  const parsed = parseCronSchedule(schedule);
  const cronExpression = scheduleToCronExpression(parsed);

  const configDir = path.dirname(getConfigPath());
  await fs.mkdir(configDir, { recursive: true });

  const wrapperPath = path.join(configDir, WRAPPER_SCRIPT_NAME);
  const logPath = path.join(configDir, LOG_FILE_NAME);

  const scriptBody = [
    "#!/bin/sh",
    `"${nodePath}" "${entryScriptPath}" update >> "${logPath}" 2>&1`,
  ].join("\n");

  await fs.writeFile(wrapperPath, scriptBody + "\n", "utf8");
  await fs.chmod(wrapperPath, 0o755);

  const scheduleLine = `${cronExpression} ${wrapperPath}`;
  const betBlock = [CRON_MARKER, scheduleLine].join("\n");

  const crontabL = spawnSync("crontab", ["-l"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let existingCrontab = "";
  if (crontabL.status === 0 && crontabL.stdout) {
    existingCrontab = crontabL.stdout;
  }
  if (crontabL.status !== 0 && crontabL.stderr && !crontabL.stderr.includes("no crontab")) {
    throw new Error(`crontab -l failed: ${crontabL.stderr}`);
  }

  const lines = existingCrontab.split("\n");
  const out: string[] = [];
  let skipNext = false;
  let betBlockReplaced = false;

  for (const line of lines) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (line === CRON_MARKER) {
      if (!betBlockReplaced) {
        out.push(betBlock);
        betBlockReplaced = true;
      }
      skipNext = true;
      continue;
    }
    out.push(line);
  }

  if (!betBlockReplaced) {
    if (out.length > 0 && !out[out.length - 1].endsWith("\n") && out[out.length - 1] !== "") {
      out.push("");
    }
    out.push(betBlock);
  }

  const newCrontab = out.join("\n").replace(/\n*$/, "") + "\n";

  const crontabWrite = spawnSync("crontab", ["-"], {
    encoding: "utf8",
    input: newCrontab,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (crontabWrite.status !== 0) {
    const err = crontabWrite.stderr || crontabWrite.stdout || "unknown";
    throw new Error(`crontab install failed: ${err}`);
  }

  return { wrapperPath, logPath };
}

/**
 * Removes the bet update cron entry from the user's crontab (if present).
 */
export async function uninstallUpdateCron(): Promise<void> {
  const crontabL = spawnSync("crontab", ["-l"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let existingCrontab = "";
  if (crontabL.status === 0 && crontabL.stdout) {
    existingCrontab = crontabL.stdout;
  }
  if (crontabL.status !== 0 && crontabL.stderr && !crontabL.stderr.includes("no crontab")) {
    throw new Error(`crontab -l failed: ${crontabL.stderr}`);
  }

  const lines = existingCrontab.split("\n");
  const out: string[] = [];
  let skipNext = false;

  for (const line of lines) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (line === CRON_MARKER) {
      skipNext = true;
      continue;
    }
    out.push(line);
  }

  const newCrontab = out.length > 0 ? out.join("\n").replace(/\n*$/, "") + "\n" : "";

  if (newCrontab === "") {
    spawnSync("crontab", ["-r"], { stdio: "pipe" });
    return;
  }

  const crontabWrite = spawnSync("crontab", ["-"], {
    encoding: "utf8",
    input: newCrontab,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (crontabWrite.status !== 0) {
    const err = crontabWrite.stderr || crontabWrite.stdout || "unknown";
    throw new Error(`crontab update failed: ${err}`);
  }
}

/**
 * Returns a human-readable label for a parsed schedule (e.g. "every 5 minutes").
 */
export function formatScheduleLabel(parsed: ParsedCronSchedule): string {
  const { value, unit } = parsed;
  if (unit === "m") {
    return value === 1 ? "every minute" : `every ${value} minutes`;
  }
  if (unit === "h") {
    return value === 1 ? "every hour" : `every ${value} hours`;
  }
  return value === 1 ? "every day" : `every ${value} days`;
}
