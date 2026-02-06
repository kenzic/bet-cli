import chalk from 'chalk';
import { Command } from 'commander';
import { readConfig } from '../lib/config.js';
import path from 'node:path';
import { listProjects } from '../lib/projects.js';
import { searchProjects } from '../lib/search.js';
import { emitSelection } from '../utils/output.js';
import { promptSearch } from '../ui/prompt.js';
import { SelectEntry } from '../ui/select.js';

const MAX_ROWS = 18;

function relativePath(projectPath: string, root: string): string {
  const rel = path.relative(root, projectPath);
  return rel || path.basename(projectPath);
}

function formatLabel(slug: string, group: string, relPath: string): string {
  return `${slug} [${group}] ${relPath}`;
}

export function registerSearch(program: Command): void {
  program
    .command('search [query]')
    .description('Search projects')
    .option('--plain', 'Print a non-interactive list')
    .option('--json', 'Print JSON output')
    .option('--print', 'Print selected path only')
    .option('--limit <n>', 'Limit results', '50')
    .action(async (query = '', options: { plain?: boolean; json?: boolean; print?: boolean; limit?: string }) => {
      const config = await readConfig();
      const projects = listProjects(config);
      const matches = searchProjects(projects, query);
      const limit = Number.parseInt(options.limit ?? '50', 10);
      const results = Number.isNaN(limit) ? matches : matches.slice(0, limit);

      if (options.json) {
        process.stdout.write(JSON.stringify(results, null, 2));
        process.stdout.write('\n');
        return;
      }

      if (!process.stdin.isTTY || options.plain) {
        if (results.length === 0) {
          process.stdout.write('No matches.\n');
          return;
        }
        for (const project of results) {
          const rel = relativePath(project.path, project.root);
          process.stdout.write(`${formatLabel(project.slug, project.group, rel)}\n`);
        }
        return;
      }

      const allItems: SelectEntry<typeof projects[number]>[] = projects.map((project) => {
        const rel = relativePath(project.path, project.root);
        return {
          type: 'item',
          label: formatLabel(project.slug, project.group, rel),
          value: project,
        };
      });

      const selected = await promptSearch(allItems, {
        title: 'Search',
        initialQuery: query,
        maxRows: MAX_ROWS,
        filter: (items, q) => {
          if (!q.trim()) return items;
          const matches = searchProjects(projects, q);
          const matchSet = new Set(matches.map((project) => project.path));
          return items.filter((item) => matchSet.has(item.value.path));
        },
      });
      if (!selected) return;

      emitSelection(selected.value, { printOnly: options.print });
    });
}
