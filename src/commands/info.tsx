import chalk from "chalk";
import { Command } from "commander";
import React from "react";
import { render, Box, Text } from "ink";
import { readConfig } from "../lib/config.js";
import { findBySlug, listProjects, projectLabel } from "../lib/projects.js";
import { getDirtyStatus, isInsideGitRepo } from "../lib/git.js";
import { formatDate } from "../utils/format.js";
import { promptSelect } from "../ui/prompt.js";
import { SelectEntry } from "../ui/select.js";
import { readReadmeContent } from "../lib/readme.js";
import Markdown from "../ui/markdown.js";

type MetaRowProps = {
  label: string;
  value: string;
  valueColor?:
    | "green"
    | "red"
    | "yellow"
    | "blue"
    | "cyan"
    | "magenta"
    | "gray";
};

const MetaRow: React.FC<MetaRowProps> = ({ label, value, valueColor }) => (
  <Box>
    <Text bold color="gray">{`${label}: `}</Text>
    <Text color={valueColor} bold={!!valueColor}>
      {value}
    </Text>
  </Box>
);

export function registerInfo(program: Command): void {
  program
    .command("info <slug>")
    .description("Show project details")
    .option("--json", "Print JSON output")
    .option("--full", "Show full README content")
    .action(
      async (slug: string, options: { json?: boolean; full?: boolean }) => {
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

          const selected = await promptSelect(items, {
            title: `Select ${slug}`,
          });
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
          const readme = options.full
            ? await readReadmeContent(project.path, { full: true })
            : null;
          const markdown = readme ?? description;

          const view = (
            <Box flexDirection="column" width="100%">
              <Box
                width="100%"
                borderStyle="single"
                borderColor="green"
                paddingX={1}
                paddingY={1}
                marginBottom={1}
                flexDirection="column"
              >
                <Box width="100%" paddingBottom={1}>
                  <Text color="green" bold>
                    {project.slug}
                  </Text>
                </Box>
                <Box width="100%">
                  <Text color="cyan">{project.path}</Text>
                </Box>
              </Box>
              <Box
                borderStyle="round"
                borderColor="cyan"
                padding={1}
                flexDirection="column"
                marginBottom={1}
              >
                <Box marginBottom={1}>
                  <Text bold color="magenta">
                    Details
                  </Text>
                </Box>
                <Box flexDirection="column">
                  <MetaRow
                    label="Git"
                    value={hasGit ? "yes" : "no"}
                    valueColor={hasGit ? "green" : "yellow"}
                  />
                  <MetaRow
                    label="Git dirty"
                    value={
                      dirty === undefined ? "unknown" : dirty ? "yes" : "no"
                    }
                    valueColor={
                      dirty === undefined ? "yellow" : dirty ? "red" : "green"
                    }
                  />
                  <MetaRow
                    label="README"
                    value={project.hasReadme ? "yes" : "no"}
                    valueColor={project.hasReadme ? "green" : "yellow"}
                  />
                  <MetaRow
                    label="Started"
                    value={formatDate(project.auto.startedAt)}
                  />
                  <MetaRow
                    label="Last modified"
                    value={formatDate(project.auto.lastModifiedAt)}
                  />
                  <MetaRow
                    label="Last indexed"
                    value={formatDate(project.auto.lastIndexedAt)}
                  />

                  <MetaRow label="Root" value={project.rootName} />
                  <MetaRow label="Root path" value={project.root} />
                  {project.user?.tags?.length ? (
                    <Box>
                      <Text bold color="gray">{`Tags: `}</Text>
                      <Text color="magenta">
                        {project.user.tags.join(", ")}
                      </Text>
                    </Box>
                  ) : null}
                  {project.user?.onEnter ? (
                    <Box>
                      <Text bold color="gray">{`On enter: `}</Text>
                      <Text color="blue">{project.user.onEnter}</Text>
                    </Box>
                  ) : null}
                </Box>
              </Box>
              <Box
                borderStyle="round"
                borderColor="magenta"
                padding={1}
                flexDirection="column"
              >
                <Box marginBottom={1}>
                  <Text bold color="magenta">
                    Description
                  </Text>
                </Box>
                <Markdown>{markdown}</Markdown>
              </Box>
              {!options.full && project.hasReadme ? (
                <Box marginTop={1}>
                  <Text color="yellow">
                    Tip: Run <Text bold>bet info {project.slug} --full</Text> to
                    read the full README.
                  </Text>
                </Box>
              ) : null}
            </Box>
          );

          const { unmount } = render(view, { stdout: process.stdout });
          await new Promise((resolve) => setTimeout(resolve, 0));
          unmount();
          return;
        }

        process.stdout.write(`${chalk.bold(project.slug)}\n`);
        process.stdout.write(`${chalk.dim(project.path)}\n\n`);

        process.stdout.write(`${chalk.bold("Root:")} ${project.rootName}\n`);
        process.stdout.write(`${chalk.bold("Root path:")} ${project.root}\n`);
        process.stdout.write(
          `${chalk.bold("Git:")} ${hasGit ? "yes" : "no"}\n`,
        );
        process.stdout.write(
          `${chalk.bold("README:")} ${project.hasReadme ? "yes" : "no"}\n\n`,
        );

        const descToShow =
          options.full && project.hasReadme
            ? ((await readReadmeContent(project.path, { full: true })) ??
              description)
            : description;
        process.stdout.write(`${chalk.bold("Description:")} ${descToShow}\n`);
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
      },
    );
}
