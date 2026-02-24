import { isSubpath } from "../utils/paths.js";

export const DEFAULT_IGNORES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/target/**",
  "**/vendor/**",
  "**/.venv/**",
  "**/venv/**",
];

export function getEffectiveIgnores(config: { ignores?: string[] }): string[] {
  return config.ignores !== undefined ? config.ignores : DEFAULT_IGNORES;
}

export function isPathIgnored(projectPath: string, ignoredPaths: string[]): boolean {
  if (ignoredPaths.length === 0) return false;
  return ignoredPaths.some(
    (ip) => projectPath === ip || isSubpath(projectPath, ip),
  );
}
