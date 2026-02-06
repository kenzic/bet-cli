import path from "node:path";
import { Command } from "commander";
import { readConfig, resolveRoots, writeConfig } from "../lib/config.js";
import { installHourlyUpdateCron } from "../lib/cron.js";
import { scanRoots } from "../lib/scan.js";
import { computeMetadata } from "../lib/metadata.js";
import { computeGroup } from "../lib/projects.js";
import { Config, Project } from "../lib/types.js";
import { isInsideGitRepo } from "../lib/git.js";

function parseRoots(value?: string): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(",")
    .map((root) => root.trim())
    .filter(Boolean);
}

function projectSlug(pathName: string): string {
  // name of folder unless the folder is in src or app, then use the name of the parent folder
  const folderName = path.basename(pathName);
  if (folderName === "src" || folderName === "app") {
    return path.basename(path.dirname(pathName));
  }
  return folderName;
}

export function registerUpdate(program: Command): void {
  program
    .command("update")
    .description("Scan roots and update the project index")
    .option("--roots <paths>", "Comma-separated list of roots to scan")
    .option("--cron", "Install an hourly cron job to run bet update")
    .action(async (options: { roots?: string; cron?: boolean }) => {
      const config = await readConfig();
      const providedRoots = parseRoots(options.roots);
      const configRoots = config.roots.length > 0 ? config.roots : undefined;
      const rootsToUse = providedRoots ?? configRoots;

      if (!rootsToUse || rootsToUse.length === 0) {
        process.stderr.write(
          "Error: No roots specified. Please provide roots using --roots option.\n" +
            "Example: bet update --roots /path/to/your/code\n",
        );
        process.exitCode = 1;
        return;
      }

      const roots = resolveRoots(rootsToUse);

      const candidates = await scanRoots(roots);
      const projects: Record<string, Project> = {};

      for (const candidate of candidates) {
        // Verify git status using git probe (handles parent repos)
        const hasGit = await isInsideGitRepo(candidate.path);
        const auto = await computeMetadata(candidate.path, hasGit);
        const slug = projectSlug(candidate.path);
        const existing = config.projects[candidate.path];

        const project: Project = {
          id: candidate.path,
          slug,
          name: slug,
          path: candidate.path,
          root: candidate.root,
          group: computeGroup(candidate.root, candidate.path),
          hasGit,
          hasReadme: candidate.hasReadme,
          auto,
          user: existing?.user,
        };

        projects[candidate.path] = project;
      }

      const nextConfig: Config = {
        version: config.version ?? 1,
        roots,
        projects,
      };

      await writeConfig(nextConfig);

      process.stdout.write(
        `Indexed ${Object.keys(projects).length} projects from ${roots.length} root(s).\n`,
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
