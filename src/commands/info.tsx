import chalk from "chalk";
import { Command } from "commander";
import { readConfig } from "../lib/config.js";
import { render, Box, Text } from "ink";
import { findBySlug, listProjects, projectLabel } from "../lib/projects.js";
import { getDirtyStatus, isInsideGitRepo } from "../lib/git.js";
import { formatDate } from "../utils/format.js";
import { promptSelect } from "../ui/prompt.js";
import { SelectEntry } from "../ui/select.js";
import { readReadmeContent } from "../lib/readme.js";
import Table from "../ui/table.js";

const data: { [key: string]: string }[] = [];

export function registerInfo(program: Command): void {
  program
    .command("info <slug>")
    .description("Show project details")
    .option("--json", "Print JSON output")
    .action(async (slug: string, options: { json?: boolean }) => {
      const config = await readConfig();
      const projects = listProjects(config);
      const matches = findBySlug(projects, slug);

      if (matches.length === 0) {
        process.stderr.write(`No project found for slug "${slug}".\n`);
        process.exitCode = 1;
        return;
      }

      let project = matches[0];

      if (matches.length > 1) {
        if (!process.stdin.isTTY) {
          process.stderr.write(`Slug "${slug}" is ambiguous. Matches:\n`);
          for (const item of matches) {
            process.stderr.write(`  ${projectLabel(item)} ${item.path}\n`);
          }
          process.exitCode = 1;
          return;
        }

        const items: SelectEntry<(typeof matches)[number]>[] = matches.map(
          (item) => ({
            label: projectLabel(item),
            hint: item.path,
            value: item,
            type: "item",
          }),
        );

        const selected = await promptSelect(items, { title: `Select ${slug}` });
        if (!selected) return;
        project = selected.value;
      }

      if (options.json) {
        process.stdout.write(JSON.stringify(project, null, 2));
        process.stdout.write("\n");
        return;
      }

      const description =
        project.user?.description ?? project.auto.description ?? "—";
      // Compute git status live
      const hasGit = await isInsideGitRepo(project.path);
      const dirty = hasGit ? await getDirtyStatus(project.path) : undefined;

      if (process.stdin.isTTY) {
        const readme = await readReadmeContent(project.path);
        const markdown = readme ?? description;

        let Markdown: React.FC<{ children: string }> | null = null;
        try {
          const markdownModule = await import("ink-markdown");
          Markdown = (markdownModule.default ??
            markdownModule) as unknown as React.FC<{
            children: string;
          }>;
        } catch {
          Markdown = null;
        }

        const view = (
          <Box flexDirection="column">
            <Table data={data} />
            <Text color="green" bold>
              {project.slug}
            </Text>
            <Text dimColor>{project.path}</Text>
            <Box marginTop={1} flexDirection="column">
              <Text bold>{`Group: ${project.group}`}</Text>
              <Text bold>{`Root: ${project.root}`}</Text>
              <Text bold>{`Git: ${hasGit ? "yes" : "no"}`}</Text>
              <Text bold>{`README: ${project.hasReadme ? "yes" : "no"}`}</Text>
              <Text
                bold
              >{`Started: ${formatDate(project.auto.startedAt)}`}</Text>
              <Text
                bold
              >{`Last modified: ${formatDate(project.auto.lastModifiedAt)}`}</Text>
              <Text
                bold
              >{`Last indexed: ${formatDate(project.auto.lastIndexedAt)}`}</Text>
              <Text
                bold
              >{`Dirty: ${dirty === undefined ? "unknown" : dirty ? "yes" : "no"}`}</Text>
              {project.user?.tags?.length ? (
                <Text>{`Tags: ${project.user.tags.join(", ")}`}</Text>
              ) : null}
              {project.user?.onEnter ? (
                <Text>{`On enter: ${project.user.onEnter}`}</Text>
              ) : null}
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Text>{chalk.bold("Description")}</Text>
              {Markdown ? (
                <Markdown>{markdown}</Markdown>
              ) : (
                <Text>{markdown}</Text>
              )}
            </Box>
          </Box>
        );

        const { unmount } = render(view, { stdout: process.stdout });
        await new Promise((resolve) => setTimeout(resolve, 0));
        unmount();
        return;
      }

      process.stdout.write(`${chalk.bold(project.slug)}\n`);
      process.stdout.write(`${chalk.dim(project.path)}\n\n`);

      process.stdout.write(`${chalk.bold("Group:")} ${project.group}\n`);
      process.stdout.write(`${chalk.bold("Root:")} ${project.root}\n`);
      process.stdout.write(`${chalk.bold("Git:")} ${hasGit ? "yes" : "no"}\n`);
      process.stdout.write(
        `${chalk.bold("README:")} ${project.hasReadme ? "yes" : "no"}\n\n`,
      );

      process.stdout.write(`${chalk.bold("Description:")} ${description}\n`);
      process.stdout.write(
        `${chalk.bold("Started:")} ${formatDate(project.auto.startedAt)}\n`,
      );
      process.stdout.write(
        `${chalk.bold("Last modified:")} ${formatDate(project.auto.lastModifiedAt)}\n`,
      );
      process.stdout.write(
        `${chalk.bold("Last indexed:")} ${formatDate(project.auto.lastIndexedAt)}\n`,
      );
      process.stdout.write(
        `${chalk.bold("Dirty:")} ${dirty === undefined ? "unknown" : dirty ? "yes" : "no"}\n`,
      );

      if (project.user?.tags?.length) {
        process.stdout.write(
          `${chalk.bold("Tags:")} ${project.user.tags.join(", ")}\n`,
        );
      }

      if (project.user?.onEnter) {
        process.stdout.write(
          `${chalk.bold("On enter:")} ${project.user.onEnter}\n`,
        );
      }
    });
}
