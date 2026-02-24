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
