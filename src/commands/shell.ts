import { Command } from 'commander';

const SHELL_SNIPPET = [
  'bet() {',
  '  local out',
  '  out="$(BET_EVAL=1 command bet "$@")" || return $?',
  '  if [[ "$out" == __BET_EVAL__* ]]; then',
  '    eval "${out#__BET_EVAL__}"',
  '  elif [[ -n "$out" ]]; then',
  '    printf "%s\\n" "$out"',
  '  fi',
  '}',
].join('\n');

export function registerShell(program: Command): void {
  program
    .command('shell')
    .description('Print shell integration for cd support')
    .action(() => {
      process.stdout.write(`${SHELL_SNIPPET}\n`);
    });
}
