import path from "node:path";
import readline from "node:readline";
import { Command } from "commander";
import { readConfig, resolveRoots, writeConfig } from "../lib/config.js";
import { normalizeAbsolute } from "../utils/paths.js";
import { installUpdateCron, uninstallUpdateCron, parseCronSchedule, formatScheduleLabel } from "../lib/cron.js";
import { scanRoots } from "../lib/scan.js";
import { computeMetadata } from "../lib/metadata.js";
import { getEffectiveIgnores, isPathIgnored } from "../lib/ignore.js";
import { Config, Project, RootConfig } from "../lib/types.js";
import { isInsideGitRepo } from "../lib/git.js";
import { log } from "../lib/logger.js";

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

const DEFAULT_SLUG_PARENT_FOLDERS = ["src", "app"];

export { DEFAULT_SLUG_PARENT_FOLDERS };
export function projectSlug(pathName: string, slugParentFolders: string[]): string {
  const folderName = path.basename(pathName);
  if (slugParentFolders.includes(folderName)) {
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
    .option("--cron [frequency]", "Run update on a schedule: Nm/Nh/Nd e.g. 5m, 1h, 2d (default 1h), or 0/false to disable")
    .action(async (options: { roots?: string; force?: boolean; cron?: boolean | string }) => {
      try {
      const config = await readConfig();
      const providedPaths = parseRoots(options.roots);
      const providedRootConfigs = providedPaths
        ? pathsToRootConfigs(providedPaths)
        : undefined;
      const configRoots = config.roots.length > 0 ? config.roots : undefined;
      const rootsToUse = providedRootConfigs ?? configRoots;

      if (!rootsToUse || rootsToUse.length === 0) {
        log.error("update failed: no roots specified");
        process.stderr.write(
          "Error: No roots specified. Please provide roots using --roots option.\n" +
            "Example: bet update --roots /path/to/your/code\n",
        );
        process.exitCode = 1;
        return;
      }

      const willOverride = willOverrideRoots(providedRootConfigs, config.roots);

      if (willOverride) {
        log.warn("--roots overrides configured roots", "configured:", configRoots!.map((r) => r.path).join(", "), "provided:", providedRootConfigs!.map((r) => r.path).join(", "));
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
            log.error("update failed: refusing to override roots without confirmation (use --force when not in TTY)");
            process.stderr.write(
              "Error: Refusing to override without confirmation. Run interactively or use --force.\n",
            );
            process.exitCode = 1;
            return;
          }
        } else {
          const confirmed = await promptYesNo("Continue?", true);
          if (!confirmed) {
            log.info("update aborted by user");
            process.stderr.write("Aborted.\n");
            return;
          }
        }
      }

      const rootsResolved = resolveRoots(rootsToUse);
      const rootPaths = rootsResolved.map((r) => r.path);
      log.info("update started", "roots=" + rootPaths.join(", "));
      log.debug("scanning roots", rootPaths.length, "root(s)");
      const ignores = getEffectiveIgnores(config);
      const candidates = await scanRoots(rootPaths, ignores);
      const ignoredPaths = config.ignoredPaths ?? [];
      const filteredCandidates = candidates.filter(
        (c) => !isPathIgnored(c.path, ignoredPaths),
      );
      log.debug("found", filteredCandidates.length, "candidate(s) after ignoring paths");
      const projects: Record<string, Project> = {};

      for (const candidate of filteredCandidates) {
        const hasGit = await isInsideGitRepo(candidate.path);
        const auto = await computeMetadata(candidate.path, hasGit, ignores);
        const slug = projectSlug(candidate.path, config.slugParentFolders ?? DEFAULT_SLUG_PARENT_FOLDERS);
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
        ...(config.ignores !== undefined && { ignores: config.ignores }),
        ...(config.ignoredPaths !== undefined && { ignoredPaths: config.ignoredPaths }),
        ...(config.slugParentFolders !== undefined && { slugParentFolders: config.slugParentFolders }),
      };

      await writeConfig(nextConfig);

      const projectCount = Object.keys(projects).length;
      const rootCount = rootsResolved.length;
      log.info("update completed", "projects=" + projectCount, "roots=" + rootCount);

      process.stdout.write(
        "Indexed " +
          projectCount +
          " projects from " +
          rootCount +
          " root(s).\n",
      );

      if (options.cron !== undefined && options.cron !== false) {
        const entryScriptPath = path.isAbsolute(process.argv[1] ?? "")
          ? process.argv[1]
          : path.resolve(process.cwd(), process.argv[1] ?? "dist/index.js");
        const cronOpt = options.cron;
        if (cronOpt === true) {
          await installUpdateCron({
            nodePath: process.execPath,
            entryScriptPath,
            schedule: "1h",
          });
          process.stdout.write("Installed cron for bet update (every hour).\n");
        } else if (typeof cronOpt === "string") {
          const normalized = cronOpt.trim().toLowerCase();
          if (normalized === "0" || normalized === "false") {
            await uninstallUpdateCron();
            process.stdout.write("Removed cron for bet update.\n");
          } else {
            try {
              const parsed = parseCronSchedule(cronOpt);
              await installUpdateCron({
                nodePath: process.execPath,
                entryScriptPath,
                schedule: cronOpt,
              });
              const label = formatScheduleLabel(parsed);
              process.stdout.write(`Installed cron for bet update (${label}).\n`);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              log.error(err instanceof Error ? err : new Error(message));
              process.stderr.write(`Error: ${message}\n`);
              process.exitCode = 1;
            }
          }
        }
      }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error(err instanceof Error ? err : new Error(message));
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });
}
