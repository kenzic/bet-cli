import { Command } from "commander";
import { readConfig, writeConfig } from "../lib/config.js";
import { normalizeAbsolute, isSubpath } from "../utils/paths.js";

function isPathUnderRoot(filePath: string, rootPath: string): boolean {
  return filePath === rootPath || isSubpath(filePath, rootPath);
}

function isPathUnderAnyRoot(filePath: string, rootPaths: string[]): boolean {
  return rootPaths.some((rootPath) => isPathUnderRoot(filePath, rootPath));
}

export function registerIgnore(program: Command): void {
  const ignoreCmd = program
    .command("ignore")
    .description("Manage ignored project paths (excluded from index)");

  ignoreCmd
    .command("add [filepath]")
    .description("Add a path to the ignore list (must be under a configured root)")
    .option("--this", "Ignore the current folder")
    .action(async (filepath: string | undefined, options: { this?: boolean }) => {
      const pathToAdd = options.this ? process.cwd() : filepath;
      if (pathToAdd === undefined || pathToAdd === "") {
        process.stderr.write("Error: Provide a path or use --this to ignore the current folder.\n");
        process.exitCode = 1;
        return;
      }
      const normalized = normalizeAbsolute(pathToAdd);
      const config = await readConfig();

      if (!config.roots.length) {
        process.stderr.write("Error: No roots configured. Add roots first (e.g. bet update --roots /path/to/code).\n");
        process.exitCode = 1;
        return;
      }

      const rootPaths = config.roots.map((r) => r.path);
      if (!isPathUnderAnyRoot(normalized, rootPaths)) {
        process.stderr.write(
          `Error: Path must be under a configured root.\n  Path: ${normalized}\n  Roots: ${rootPaths.join(", ")}\n`,
        );
        process.exitCode = 1;
        return;
      }

      const ignoredPaths = config.ignoredPaths ?? [];
      if (ignoredPaths.includes(normalized)) {
        process.stdout.write(`Already ignored: ${normalized}\n`);
        return;
      }

      const nextIgnoredPaths = [...ignoredPaths, normalized];
      await writeConfig({
        ...config,
        ignoredPaths: nextIgnoredPaths,
      });
      process.stdout.write(`Ignored: ${normalized}\n`);
    });

  ignoreCmd
    .command("rm <filepath>")
    .description("Remove a path from the ignore list")
    .action(async (filepath: string) => {
      const normalized = normalizeAbsolute(filepath);
      const config = await readConfig();
      const ignoredPaths = config.ignoredPaths ?? [];
      const index = ignoredPaths.indexOf(normalized);

      if (index === -1) {
        process.stdout.write(`Not in ignore list: ${normalized}\n`);
        return;
      }

      const nextIgnoredPaths = ignoredPaths.filter((_, i) => i !== index);
      await writeConfig({
        ...config,
        ignoredPaths: nextIgnoredPaths.length > 0 ? nextIgnoredPaths : undefined,
      });
      process.stdout.write(`Removed from ignore list: ${normalized}\n`);
    });

  ignoreCmd
    .command("list")
    .description("List ignored paths")
    .action(async () => {
      const config = await readConfig();
      const ignoredPaths = config.ignoredPaths ?? [];
      for (const p of ignoredPaths) {
        process.stdout.write(`${p}\n`);
      }
    });
}
