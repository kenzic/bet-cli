import chalk from 'chalk';
import { Command } from 'commander';
import { readConfig } from '../lib/config.js';
import path from 'node:path';
import { listProjects } from '../lib/projects.js';
import { emitSelection } from '../utils/output.js';
import { promptSelect } from '../ui/prompt.js';
import { SelectRow } from '../ui/select.js';

const MAX_ROWS = 18;
const GROUP_COLORS = ['#22d3ee', '#34d399', '#facc15', '#c084fc', '#60a5fa', '#f87171'];

function groupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

function relativePath(projectPath: string, root: string): string {
  const rel = path.relative(root, projectPath);
  return rel || path.basename(projectPath);
}

function formatLabel(slug: string, group: string, relPath: string): string {
  return `${slug} [${group}] ${relPath}`;
}

export function registerList(program: Command): void {
  program
    .command('list')
    .description('List projects')
    .option('--plain', 'Print a non-interactive list')
    .option('--json', 'Print JSON output')
    .option('--print', 'Print selected path only')
    .action(async (options: { plain?: boolean; json?: boolean; print?: boolean }) => {
      const config = await readConfig();
      const projects = listProjects(config);

      if (options.json) {
        process.stdout.write(JSON.stringify(projects, null, 2));
        process.stdout.write('\n');
        return;
      }

      if (!process.stdin.isTTY || options.plain) {
        if (projects.length === 0) {
          process.stdout.write('No projects indexed. Run bet update.\n');
          return;
        }
        const grouped = new Map<string, typeof projects>();
        for (const project of projects) {
          if (!grouped.has(project.group)) grouped.set(project.group, []);
          grouped.get(project.group)?.push(project);
        }
        let groupIndex = 0;
        for (const [group, items] of grouped) {
          const color = groupColor(groupIndex++);
          const label = chalk.hex(color).bold(`[${group}]`);
          process.stdout.write(`${label}\n`);
          for (const project of items) {
            const rel = relativePath(project.path, project.root);
            process.stdout.write(`  ${chalk.reset(formatLabel(project.slug, project.group, rel))}\n`);
          }
        }
        return;
      }

      const grouped = new Map<string, typeof projects>();
      for (const project of projects) {
        if (!grouped.has(project.group)) grouped.set(project.group, []);
        grouped.get(project.group)?.push(project);
      }

      const rows: SelectRow<typeof projects[number]>[] = [];
      let groupIndex = 0;
      for (const [group, items] of grouped) {
        rows.push({ type: 'group', label: group, color: groupColor(groupIndex++) });
        for (const project of items) {
          const rel = relativePath(project.path, project.root);
          rows.push({
            type: 'item',
            label: formatLabel(project.slug, project.group, rel),
            value: project,
          });
        }
      }

      const selected = await promptSelect(rows, { title: 'Projects', maxRows: MAX_ROWS });
      if (!selected) return;

      emitSelection(selected.value, { printOnly: options.print });
    });
}
