import { Project } from '../lib/types.js';

export type OutputMode = {
  printOnly?: boolean;
  noEnter?: boolean;
};

function shellQuote(value: string): string {
  return JSON.stringify(value);
}

export function emitSelection(project: Project, mode: OutputMode = {}): void {
  if (mode.printOnly || process.env.BET_EVAL !== '1') {
    process.stdout.write(`${project.path}\n`);
    return;
  }

  const lines: string[] = [`cd ${shellQuote(project.path)}`];
  if (!mode.noEnter && project.user?.onEnter) {
    lines.push(project.user.onEnter);
  }

  process.stdout.write(`__BET_EVAL__${lines.join('\n')}`);
}
