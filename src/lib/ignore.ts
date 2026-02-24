import { isSubpath } from "../utils/paths.js";

export const DEFAULT_IGNORES = [
  // JS/TS/Node
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  // Rust, Scala, Java (Maven)
  "**/target/**",
  // PHP, Ruby, Go
  "**/vendor/**",
  // Python
  "**/.venv/**",
  "**/venv/**",
  "**/__pycache__/**",
  "**/.mypy_cache/**",
  "**/.pytest_cache/**",
  "**/.eggs/**",
  "**/*.egg-info/**",
  "**/*.egg",
  // Ruby
  "**/.bundle/**",
  "**/vendor/bundle/**",
  // PHP (Symfony, Laravel cache/log)
  "**/var/cache/**",
  "**/var/log/**",
  // Java/Kotlin (Gradle, IntelliJ output)
  "**/.gradle/**",
  "**/out/**",
  // Elixir
  "**/deps/**",
  "**/_build/**",
  // Swift
  "**/.build/**",
  "**/DerivedData/**",
  // Dart/Flutter
  "**/.dart_tool/**",
  "**/.packages",
  // C# / .NET
  "**/obj/**",
  // Haskell
  "**/.stack-work/**",
  "**/.cabal-sandbox/**",
  // Scala (Metals)
  "**/.metals/**",
  "**/.bloop/**",
];

export function getEffectiveIgnores(config: { ignores?: string[] }): string[] {
  return config.ignores !== undefined ? config.ignores : DEFAULT_IGNORES;
}

export function isPathIgnored(
  projectPath: string,
  ignoredPaths: string[],
): boolean {
  if (ignoredPaths.length === 0) return false;
  return ignoredPaths.some(
    (ip) => projectPath === ip || isSubpath(projectPath, ip),
  );
}
