import os from 'node:os';
import path from 'node:path';

export function expandHome(inputPath: string): string {
  if (!inputPath) return inputPath;
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

export function normalizeAbsolute(inputPath: string): string {
  return path.resolve(expandHome(inputPath));
}

export function isSubpath(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}
