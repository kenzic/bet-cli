import chalk from 'chalk';
import { Command } from 'commander';
import { readConfig } from '../lib/config.js';
import path from 'node:path';
import { listProjects } from '../lib/projects.js';
import type { Project, RootConfig } from '../lib/types.js';
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

function formatLabel(slug: string, rootName: string, relPath: string): string {
  return `${slug} [${rootName}] ${relPath}`;
}

function orderedGroupsByConfigRoots(
  projects: Project[],
  roots: RootConfig[],
): { rootName: string; items: Project[] }[] {
  const groupsByRoot = new Map<string, { rootName: string; items: Project[] }>();
  for (const project of projects) {
    const key = project.root;
    if (!groupsByRoot.has(key)) {
      groupsByRoot.set(key, { rootName: project.rootName, items: [] });
    }
    groupsByRoot.get(key)!.items.push(project);
  }

  const ordered: { rootName: string; items: Project[] }[] = [];
  const seen = new Set<string>();

  for (const rootConfig of roots) {
    const group = groupsByRoot.get(rootConfig.path);
    if (group) {
      seen.add(rootConfig.path);
      ordered.push({ rootName: rootConfig.name, items: group.items });
    }
  }

  const remaining = [...groupsByRoot.entries()]
    .filter(([rootPath]) => !seen.has(rootPath))
    .sort((a, b) => a[1].rootName.localeCompare(b[1].rootName));
  for (const [, group] of remaining) {
    ordered.push(group);
  }

  return ordered;
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
        const orderedGroups = orderedGroupsByConfigRoots(projects, config.roots);
        let groupIndex = 0;
        for (const { rootName, items } of orderedGroups) {
          const color = groupColor(groupIndex++);
          const label = chalk.hex(color).bold(`[${rootName}]`);
          process.stdout.write(`${label}\n`);
          for (const project of items) {
            const rel = relativePath(project.path, project.root);
            process.stdout.write(`  ${chalk.reset(formatLabel(project.slug, project.rootName, rel))}\n`);
          }
        }
        return;
      }

      const orderedGroups = orderedGroupsByConfigRoots(projects, config.roots);
      const rows: SelectRow<Project>[] = [];
      let groupIndex = 0;
      for (const { rootName, items } of orderedGroups) {
        rows.push({ type: 'group', label: rootName, color: groupColor(groupIndex++) });
        for (const project of items) {
          const rel = relativePath(project.path, project.root);
          rows.push({
            type: 'item',
            label: formatLabel(project.slug, project.rootName, rel),
            value: project,
          });
        }
      }

      const selected = await promptSelect(rows, { title: 'Projects', maxRows: MAX_ROWS });
      if (!selected) return;

      emitSelection(selected.value, { printOnly: options.print });
    });
}
