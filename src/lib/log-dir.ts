import path from "node:path";
import os from "node:os";

const LOG_FILE_NAME = "bet.log";

/**
 * Returns the directory where bet writes its log file.
 * - macOS: ~/Library/Logs/bet
 * - Linux / others: $XDG_STATE_HOME/bet or ~/.local/state/bet
 */
export function getLogDir(): string {
  const homedir = os.homedir();
  if (process.platform === "darwin") {
    return path.join(homedir, "Library", "Logs", "bet");
  }
  const stateHome =
    process.env.XDG_STATE_HOME ?? path.join(homedir, ".local", "state");
  return path.join(stateHome, "bet");
}

/**
 * Returns the full path to the log file (e.g. getLogDir()/bet.log).
 */
export function getLogFilePath(): string {
  return path.join(getLogDir(), LOG_FILE_NAME);
}
