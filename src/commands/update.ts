import path from "node:path";
import readline from "node:readline";
import { Command } from "commander";
import { readConfig, resolveRoots, writeConfig } from "../lib/config.js";
import { normalizeAbsolute } from "../utils/paths.js";
import { installHourlyUpdateCron } from "../lib/cron.js";
import { scanRoots } from "../lib/scan.js";
import { computeMetadata } from "../lib/metadata.js";
import { Config, Project, RootConfig } from "../lib/types.js";
import { isInsideGitRepo } from "../lib/git.js";

function parseRoots(value?: string): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(",")
    .map((root) => root.trim())
    .filter(Boolean);
}

function pathsToRootConfigs(paths: string[]): RootConfig[] {
  return paths.map((p) => {
    const abs = normalizeAbsolute(p);
    return { path: abs, name: path.basename(abs) };
  });
}

export function willOverrideRoots(
  providedRootConfigs: RootConfig[] | undefined,
  configRoots: RootConfig[],
): boolean {
  return !!(
    providedRootConfigs !== undefined &&
    configRoots.length > 0
  );
}

function projectSlug(pathName: string): string {
  const folderName = path.basename(pathName);
  if (folderName === "src" || folderName === "app") {
    return path.basename(path.dirname(pathName));
  }
  return folderName;
}

async function promptYesNo(question: string, defaultNo = true): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    const defaultHint = defaultNo ? "y/N" : "Y/n";
    rl.question(question + " [" + defaultHint + "] ", (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (!trimmed) {
        resolve(!defaultNo);
        return;
      }
      resolve(trimmed === "y" || trimmed === "yes");
    });
  });
}

export function registerUpdate(program: Command): void {
  program
    .command("update")
    .description("Scan roots and update the project index")
    .option("--roots <paths>", "Comma-separated list of roots to scan")
    .option("--force", "Allow overriding configured roots when not in TTY")
    .option("--cron", "Install an hourly cron job to run bet update")
    .action(async (options: { roots?: string; force?: boolean; cron?: boolean }) => {
      const config = await readConfig();
      const providedPaths = parseRoots(options.roots);
      const providedRootConfigs = providedPaths
        ? pathsToRootConfigs(providedPaths)
        : undefined;
      const configRoots = config.roots.length > 0 ? config.roots : undefined;
      const rootsToUse = providedRootConfigs ?? configRoots;

      if (!rootsToUse || rootsToUse.length === 0) {
        process.stderr.write(
          "Error: No roots specified. Please provide roots using --roots option.\n" +
            "Example: bet update --roots /path/to/your/code\n",
        );
        process.exitCode = 1;
        return;
      }

      const willOverride = willOverrideRoots(providedRootConfigs, config.roots);

      if (willOverride) {
        process.stderr.write(
          "Warning: --roots will override your configured roots.\n" +
            "  Configured: " +
            configRoots!.map((r) => r.path).join(", ") +
            "\n  Provided:   " +
            providedRootConfigs!.map((r) => r.path).join(", ") +
            "\n",
        );
        if (!process.stdin.isTTY) {
          if (!options.force) {
            process.stderr.write(
              "Error: Refusing to override without confirmation. Run interactively or use --force.\n",
            );
            process.exitCode = 1;
            return;
          }
        } else {
          const confirmed = await promptYesNo("Continue?", true);
          if (!confirmed) {
            process.stderr.write("Aborted.\n");
            return;
          }
        }
      }

      const rootsResolved = resolveRoots(rootsToUse);
      const rootPaths = rootsResolved.map((r) => r.path);
      const candidates = await scanRoots(rootPaths);
      const projects: Record<string, Project> = {};

      for (const candidate of candidates) {
        const hasGit = await isInsideGitRepo(candidate.path);
        const auto = await computeMetadata(candidate.path, hasGit);
        const slug = projectSlug(candidate.path);
        const existing = config.projects[candidate.path];
        const rootConfig = rootsResolved.find((r) => r.path === candidate.root);
        const rootName = rootConfig?.name ?? path.basename(candidate.root);

        const project: Project = {
          id: candidate.path,
          slug,
          name: slug,
          path: candidate.path,
          root: candidate.root,
          rootName,
          hasGit,
          hasReadme: candidate.hasReadme,
          auto,
          user: existing?.user,
        };

        projects[candidate.path] = project;
      }

      const nextConfig: Config = {
        version: config.version ?? 1,
        roots: rootsResolved,
        projects,
      };

      await writeConfig(nextConfig);

      process.stdout.write(
        "Indexed " +
          Object.keys(projects).length +
          " projects from " +
          rootsResolved.length +
          " root(s).\n",
      );

      if (options.cron) {
        const entryScriptPath = path.isAbsolute(process.argv[1] ?? "")
          ? process.argv[1]
          : path.resolve(process.cwd(), process.argv[1] ?? "dist/index.js");
        await installHourlyUpdateCron({
          nodePath: process.execPath,
          entryScriptPath,
        });
        process.stdout.write("Installed hourly cron job for bet update.\n");
      }
    });
}
