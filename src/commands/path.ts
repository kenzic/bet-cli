import { Command } from 'commander';
import { readConfig } from '../lib/config.js';
import { findBySlug, listProjects, projectLabel } from '../lib/projects.js';
import { promptSelect } from '../ui/prompt.js';
import { SelectEntry } from '../ui/select.js';

export function registerPath(program: Command): void {
  program
    .command('path <slug>')
    .description('Print the absolute path of a project by name')
    .action(async (slug: string) => {
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

        const items: SelectEntry<(typeof matches)[number]>[] = matches.map((item) => ({
          label: projectLabel(item),
          hint: item.path,
          value: item,
          type: 'item',
        }));

        const selected = await promptSelect(items, { title: `Select ${slug}` });
        if (!selected) return;
        project = selected.value;
      }

      process.stdout.write(`${project.path}\n`);
    });
}
