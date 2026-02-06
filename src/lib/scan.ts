import path from "node:path";
import fg from "fast-glob";
import { ProjectCandidate } from "./types.js";
import { DEFAULT_IGNORES } from "./ignore.js";
import { isSubpath } from "../utils/paths.js";
import { isInsideGitRepo } from "./git.js";

const README_PATTERNS = [
  "**/README.md",
  "**/readme.md",
  "**/Readme.md",
  "**/README.MD",
];

function resolveProjectRoot(matchPath: string): string {
  const container = path.dirname(matchPath);
  // if (
  //   path.basename(container) === "src" ||
  //   path.basename(container) === "app"
  // ) {
  //   return path.dirname(container);
  // }
  return container;
}

function addCandidate(
  map: Map<string, ProjectCandidate>,
  projectPath: string,
  root: string,
  flags: Partial<Pick<ProjectCandidate, "hasGit" | "hasReadme">>,
): void {
  const existing = map.get(projectPath);
  const base: ProjectCandidate = existing ?? {
    path: projectPath,
    root,
    hasGit: false,
    hasReadme: false,
  };

  const next: ProjectCandidate = {
    ...base,
    ...flags,
  };

  if (existing && root.length > existing.root.length) {
    next.root = root;
  }

  map.set(projectPath, next);
}

export async function scanRoots(roots: string[]): Promise<ProjectCandidate[]> {
  const candidates = new Map<string, ProjectCandidate>();

  for (const root of roots) {
    // Exclude .git/** from ignores when scanning for .git directories
    const gitIgnores = DEFAULT_IGNORES.filter(
      (pattern) => pattern !== "**/.git/**",
    );
    const gitMatches = await fg("**/.git", {
      cwd: root,
      dot: true,
      onlyDirectories: false,
      onlyFiles: false,
      followSymbolicLinks: false,
      ignore: gitIgnores,
    });

    for (const match of gitMatches) {
      const absMatch = path.join(root, match);
      const projectRoot = resolveProjectRoot(absMatch);
      if (!projectRoot.startsWith(root)) continue;
      addCandidate(candidates, projectRoot, root, { hasGit: true });
    }

    const readmeMatches = await fg(README_PATTERNS, {
      cwd: root,
      dot: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: DEFAULT_IGNORES,
    });

    for (const match of readmeMatches) {
      const absMatch = path.join(root, match);
      const projectRoot = resolveProjectRoot(absMatch);
      if (!projectRoot.startsWith(root)) continue;
      addCandidate(candidates, projectRoot, root, { hasReadme: true });
    }
  }

  const list = Array.from(candidates.values());
  list.sort((a, b) => a.path.length - b.path.length);

  const filtered: ProjectCandidate[] = [];
  for (const candidate of list) {
    const nested = filtered.some((kept) =>
      isSubpath(candidate.path, kept.path),
    );
    if (!nested) {
      filtered.push(candidate);
    }
  }

  // Check git status for all candidates (including those inside parent repos)
  for (const candidate of filtered) {
    if (!candidate.hasGit) {
      const hasGit = await isInsideGitRepo(candidate.path);
      if (hasGit) {
        candidate.hasGit = true;
      }
    }
  }

  return filtered;
}
