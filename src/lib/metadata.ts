import fg from 'fast-glob';
import { ProjectAutoMetadata } from './types.js';
import { getDirtyStatus, getFirstCommitDate } from './git.js';
import { readReadmeDescription } from './readme.js';

export async function computeMetadata(projectPath: string, hasGit: boolean, ignores: string[]): Promise<ProjectAutoMetadata> {
  const nowIso = new Date().toISOString();

  const entries = await fg('**/*', {
    cwd: projectPath,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: ignores,
    stats: true,
  });

  let oldest: number | undefined;
  let newest: number | undefined;

  for (const entry of entries) {
    const stats = entry.stats;
    if (!stats) continue;
    const mtime = stats.mtimeMs;
    if (oldest === undefined || mtime < oldest) oldest = mtime;
    if (newest === undefined || mtime > newest) newest = mtime;
  }

  const description = await readReadmeDescription(projectPath);
  const startedAt = hasGit ? await getFirstCommitDate(projectPath) : undefined;
  const dirty = hasGit ? await getDirtyStatus(projectPath) : undefined;

  return {
    description,
    startedAt: startedAt ?? (oldest ? new Date(oldest).toISOString() : undefined),
    lastModifiedAt: newest ? new Date(newest).toISOString() : undefined,
    lastIndexedAt: nowIso,
    dirty,
  };
}
