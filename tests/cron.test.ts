import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import {
  parseCronSchedule,
  scheduleToCronExpression,
  formatScheduleLabel,
  installUpdateCron,
  uninstallUpdateCron,
} from "../src/lib/cron.js";
import { getConfigPath } from "../src/lib/config.js";

vi.mock("../src/lib/config.js", () => ({
  getConfigPath: vi.fn(() => path.join("/tmp", "bet-cron-test", "config.json")),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    chmod: vi.fn(),
  },
}));

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

describe("cron", () => {
  describe("parseCronSchedule", () => {
    it("parses valid minute schedules (1-59)", () => {
      expect(parseCronSchedule("1m")).toEqual({ value: 1, unit: "m" });
      expect(parseCronSchedule("5m")).toEqual({ value: 5, unit: "m" });
      expect(parseCronSchedule("30m")).toEqual({ value: 30, unit: "m" });
      expect(parseCronSchedule("59m")).toEqual({ value: 59, unit: "m" });
    });

    it("parses valid hour schedules (1-24)", () => {
      expect(parseCronSchedule("1h")).toEqual({ value: 1, unit: "h" });
      expect(parseCronSchedule("12h")).toEqual({ value: 12, unit: "h" });
      expect(parseCronSchedule("24h")).toEqual({ value: 24, unit: "h" });
    });

    it("parses valid day schedules (1-31)", () => {
      expect(parseCronSchedule("1d")).toEqual({ value: 1, unit: "d" });
      expect(parseCronSchedule("7d")).toEqual({ value: 7, unit: "d" });
      expect(parseCronSchedule("31d")).toEqual({ value: 31, unit: "d" });
    });

    it("accepts case-insensitive unit", () => {
      expect(parseCronSchedule("5M")).toEqual({ value: 5, unit: "m" });
      expect(parseCronSchedule("2H")).toEqual({ value: 2, unit: "h" });
      expect(parseCronSchedule("1D")).toEqual({ value: 1, unit: "d" });
    });

    it("trims and lowercases input", () => {
      expect(parseCronSchedule("  5m  ")).toEqual({ value: 5, unit: "m" });
    });

    it("throws on invalid format", () => {
      expect(() => parseCronSchedule("")).toThrow(/Invalid cron schedule/);
      expect(() => parseCronSchedule("5")).toThrow(/Invalid cron schedule/);
      expect(() => parseCronSchedule("m")).toThrow(/Invalid cron schedule/);
      expect(() => parseCronSchedule("1x")).toThrow(/Invalid cron schedule/);
      expect(() => parseCronSchedule("m5")).toThrow(/Invalid cron schedule/);
      expect(() => parseCronSchedule("5min")).toThrow(/Invalid cron schedule/);
    });

    it("throws on invalid minute range (0, 60, 61)", () => {
      expect(() => parseCronSchedule("0m")).toThrow(/Invalid minutes: 0/);
      expect(() => parseCronSchedule("60m")).toThrow(/Invalid minutes: 60/);
      expect(() => parseCronSchedule("61m")).toThrow(/Invalid minutes: 61/);
    });

    it("throws on invalid hour range (0, 25)", () => {
      expect(() => parseCronSchedule("0h")).toThrow(/Invalid hours: 0/);
      expect(() => parseCronSchedule("25h")).toThrow(/Invalid hours: 25/);
    });

    it("throws on invalid day range (0, 32)", () => {
      expect(() => parseCronSchedule("0d")).toThrow(/Invalid days: 0/);
      expect(() => parseCronSchedule("32d")).toThrow(/Invalid days: 32/);
    });
  });

  describe("scheduleToCronExpression", () => {
    it("maps minutes to */N * * * *", () => {
      expect(scheduleToCronExpression({ value: 1, unit: "m" })).toBe("*/1 * * * *");
      expect(scheduleToCronExpression({ value: 5, unit: "m" })).toBe("*/5 * * * *");
      expect(scheduleToCronExpression({ value: 30, unit: "m" })).toBe("*/30 * * * *");
    });

    it("maps hours to 0 */N * * *", () => {
      expect(scheduleToCronExpression({ value: 1, unit: "h" })).toBe("0 */1 * * *");
      expect(scheduleToCronExpression({ value: 2, unit: "h" })).toBe("0 */2 * * *");
      expect(scheduleToCronExpression({ value: 12, unit: "h" })).toBe("0 */12 * * *");
    });

    it("maps 24h to midnight daily", () => {
      expect(scheduleToCronExpression({ value: 24, unit: "h" })).toBe("0 0 * * *");
    });

    it("maps days to 0 0 */N * *", () => {
      expect(scheduleToCronExpression({ value: 1, unit: "d" })).toBe("0 0 */1 * *");
      expect(scheduleToCronExpression({ value: 7, unit: "d" })).toBe("0 0 */7 * *");
      expect(scheduleToCronExpression({ value: 31, unit: "d" })).toBe("0 0 */31 * *");
    });
  });

  describe("formatScheduleLabel", () => {
    it("formats minutes (singular and plural)", () => {
      expect(formatScheduleLabel({ value: 1, unit: "m" })).toBe("every minute");
      expect(formatScheduleLabel({ value: 5, unit: "m" })).toBe("every 5 minutes");
    });

    it("formats hours (singular and plural)", () => {
      expect(formatScheduleLabel({ value: 1, unit: "h" })).toBe("every hour");
      expect(formatScheduleLabel({ value: 2, unit: "h" })).toBe("every 2 hours");
    });

    it("formats days (singular and plural)", () => {
      expect(formatScheduleLabel({ value: 1, unit: "d" })).toBe("every day");
      expect(formatScheduleLabel({ value: 7, unit: "d" })).toBe("every 7 days");
    });
  });

  describe("installUpdateCron (mocked)", () => {
    const configDir = path.join("/tmp", "bet-cron-test");
    const wrapperPath = path.join(configDir, "bet-update-cron.sh");

    beforeEach(() => {
      vi.mocked(getConfigPath).mockReturnValue(path.join(configDir, "config.json"));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.chmod).mockResolvedValue(undefined);
    });

    it("throws on invalid schedule", async () => {
      await expect(
        installUpdateCron({
          nodePath: "/usr/bin/node",
          entryScriptPath: "/usr/bin/bet",
          schedule: "61m",
        }),
      ).rejects.toThrow(/Invalid minutes: 61/);
    });

    it("replaces existing bet cron block (single block)", async () => {
      const existingCrontab = [
        "# other job",
        "0 9 * * * /run/backup",
        "# bet:update",
        "0 * * * * /old/wrapper.sh",
        "",
      ].join("\n");

      let writtenCrontab = "";
      vi.mocked(spawnSync).mockImplementation((cmd, args, opts) => {
        if (cmd === "crontab" && args?.[0] === "-l") {
          return { status: 0, stdout: existingCrontab, stderr: "", output: [] } as ReturnType<typeof spawnSync>;
        }
        if (cmd === "crontab" && args?.[0] === "-" && opts?.input) {
          writtenCrontab = opts.input as string;
          return { status: 0, stdout: "", stderr: "", output: [] } as ReturnType<typeof spawnSync>;
        }
        return { status: 1, stdout: "", stderr: "unexpected", output: [] } as ReturnType<typeof spawnSync>;
      });

      await installUpdateCron({
        nodePath: "/usr/bin/node",
        entryScriptPath: "/usr/bin/bet",
        schedule: "5m",
      });

      expect(writtenCrontab).toContain("# other job");
      expect(writtenCrontab).toContain("0 9 * * * /run/backup");
      expect(writtenCrontab).toContain("# bet:update");
      expect(writtenCrontab).toContain("*/5 * * * *");
      expect(writtenCrontab).toContain(wrapperPath);
      expect(writtenCrontab).not.toContain("/old/wrapper.sh");
      const betBlocks = (writtenCrontab.match(/# bet:update/g) ?? []).length;
      expect(betBlocks).toBe(1);
    });
  });

  describe("uninstallUpdateCron (mocked)", () => {
    beforeEach(() => {
      vi.mocked(spawnSync).mockReset();
    });

    it("removes bet block and keeps rest of crontab", async () => {
      const existingCrontab = [
        "0 9 * * * /run/backup",
        "# bet:update",
        "0 * * * * /path/to/wrapper.sh",
        "",
      ].join("\n");
      let writtenCrontab = "";

      vi.mocked(spawnSync).mockImplementation((cmd, args, opts) => {
        if (cmd === "crontab" && args?.[0] === "-l") {
          return { status: 0, stdout: existingCrontab, stderr: "", output: [] } as ReturnType<typeof spawnSync>;
        }
        if (cmd === "crontab" && args?.[0] === "-" && opts?.input) {
          writtenCrontab = opts.input as string;
          return { status: 0, stdout: "", stderr: "", output: [] } as ReturnType<typeof spawnSync>;
        }
        return { status: 1, stdout: "", stderr: "unexpected", output: [] } as ReturnType<typeof spawnSync>;
      });

      await uninstallUpdateCron();

      expect(writtenCrontab).toContain("0 9 * * * /run/backup");
      expect(writtenCrontab).not.toContain("# bet:update");
      expect(writtenCrontab).not.toContain("/path/to/wrapper.sh");
    });

    it("removes crontab when bet was the only entry", async () => {
      const existingCrontab = ["# bet:update", "0 * * * * /path/to/wrapper.sh"].join("\n");
      const calls: { cmd: string; args?: string[] }[] = [];

      vi.mocked(spawnSync).mockImplementation((cmd, args) => {
        calls.push({ cmd, args: args as string[] });
        if (cmd === "crontab" && args?.[0] === "-l") {
          return { status: 0, stdout: existingCrontab, stderr: "", output: [] } as ReturnType<typeof spawnSync>;
        }
        if (cmd === "crontab" && args?.[0] === "-r") {
          return { status: 0, stdout: "", stderr: "", output: [] } as ReturnType<typeof spawnSync>;
        }
        if (cmd === "crontab" && args?.[0] === "-") {
          return { status: 0, stdout: "", stderr: "", output: [] } as ReturnType<typeof spawnSync>;
        }
        return { status: 1, stdout: "", stderr: "unexpected", output: [] } as ReturnType<typeof spawnSync>;
      });

      await uninstallUpdateCron();

      expect(calls.some((c) => c.cmd === "crontab" && c.args?.[0] === "-r")).toBe(true);
    });
  });
});
