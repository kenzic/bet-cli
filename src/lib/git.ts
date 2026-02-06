import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function runGit(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function getFirstCommitDate(cwd: string): Promise<string | undefined> {
  const output = await runGit(cwd, ['log', '--reverse', '--format=%cI', '-n', '1']);
  return output || undefined;
}

export async function getDirtyStatus(cwd: string): Promise<boolean | undefined> {
  const output = await runGit(cwd, ['status', '--porcelain']);
  if (output === null) return undefined;
  return output.length > 0;
}

export async function isInsideGitRepo(cwd: string): Promise<boolean> {
  const output = await runGit(cwd, ['rev-parse', '--is-inside-work-tree']);
  return output === 'true';
}
