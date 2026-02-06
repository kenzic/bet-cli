import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getConfigPath } from "./config.js";

const CRON_MARKER = "# bet:update hourly";
const WRAPPER_SCRIPT_NAME = "bet-update-cron.sh";
const LOG_FILE_NAME = "cron-update.log";

export type InstallHourlyUpdateCronOptions = {
  /** Absolute path to the Node binary (e.g. process.execPath). */
  nodePath: string;
  /** Absolute path to the bet CLI entry script (e.g. dist/index.js). */
  entryScriptPath: string;
};

/**
 * Writes a wrapper script and installs/updates a per-user crontab entry
 * so that `bet update` runs every hour. Idempotent: re-running replaces
 * the existing bet cron block.
 */
export async function installHourlyUpdateCron(
  options: InstallHourlyUpdateCronOptions,
): Promise<void> {
  const { nodePath, entryScriptPath } = options;
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

  const scheduleLine = `0 * * * * ${wrapperPath}`;
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
}
