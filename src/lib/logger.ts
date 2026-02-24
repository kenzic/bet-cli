import fs from "node:fs";
import { getLogDir, getLogFilePath } from "./log-dir.js";

const LEVELS = ["debug", "info", "warn", "error"] as const;
type LogLevel = (typeof LEVELS)[number];

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function parseLogLevel(): LogLevel {
  const raw = process.env.BET_LOG_LEVEL?.trim().toLowerCase();
  if (raw && LEVELS.includes(raw as LogLevel)) {
    return raw as LogLevel;
  }
  return "info";
}

let minLevelOrder: number = LEVEL_ORDER[parseLogLevel()];
let fileStream: fs.WriteStream | null = null;

function ensureStream(): fs.WriteStream {
  if (fileStream != null) {
    return fileStream;
  }
  const logDir = getLogDir();
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = getLogFilePath();
  fileStream = fs.createWriteStream(logPath, { flags: "a" });
  return fileStream;
}

function formatLine(level: LogLevel, message: string, stack?: string): string {
  const ts = new Date().toISOString();
  let line = `${ts} ${level.toUpperCase()} ${message}`;
  if (stack) {
    line += "\n" + stack;
  }
  return line + "\n";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= minLevelOrder;
}

function write(level: LogLevel, message: string, stack?: string): void {
  if (!shouldLog(level)) {
    return;
  }
  const line = formatLine(level, message, stack);
  try {
    ensureStream().write(line);
  } catch {
    // Avoid throwing from logger; best-effort only
  }
  if (process.stderr.isTTY) {
    process.stderr.write(line);
  }
}

export const log = {
  debug(msg: string, ...args: unknown[]): void {
    const message = args.length > 0 ? `${msg} ${args.map(String).join(" ")}` : msg;
    write("debug", message);
  },

  info(msg: string, ...args: unknown[]): void {
    const message = args.length > 0 ? `${msg} ${args.map(String).join(" ")}` : msg;
    write("info", message);
  },

  warn(msg: string, ...args: unknown[]): void {
    const message = args.length > 0 ? `${msg} ${args.map(String).join(" ")}` : msg;
    write("warn", message);
  },

  error(errOrMsg: Error | string, ...args: unknown[]): void {
    if (errOrMsg instanceof Error) {
      const message = errOrMsg.message;
      const stack = errOrMsg.stack;
      write("error", message, stack);
      return;
    }
    const message = args.length > 0
      ? `${String(errOrMsg)} ${args.map(String).join(" ")}`
      : String(errOrMsg);
    write("error", message);
  },
};
