import { Command } from "commander";
import { getProjectSlugs } from "../lib/completion.js";

const SLUG_COMMANDS = ["go", "path", "info"];
const SUBCOMMANDS = [
  "update",
  "list",
  "search",
  "info",
  "go",
  "path",
  "shell",
  "completion",
];

function zshScript(): string {
  const slugCommandsPattern = SLUG_COMMANDS.join("|");
  return `#compdef bet
_bet() {
  local -a subcommands
  subcommands=(
    'update:Scan roots and rebuild project index'
    'list:List projects'
    'search:Fuzzy-search projects'
    'info:Show project details'
    'go:Jump to a project'
    'path:Print project path'
    'shell:Print shell integration'
    'completion:Print shell completion script'
  )

  if (( CURRENT == 2 )); then
    _describe 'bet commands' subcommands
    return
  fi

  if [[ "${slugCommandsPattern}" == *"\$words[2]"* ]]; then
    if (( CURRENT == 3 )); then
      local -a slugs
      slugs=(\$(command bet completion --list 2>/dev/null))
      _describe 'project' slugs
    fi
    return
  fi

  _default
}
compdef _bet bet
`;
}

function bashScript(): string {
  const subcommandsList = SUBCOMMANDS.join(" ");
  const cw = "COMP_WORDS";
  const cc = "COMP_CWORD";
  const dollar = "$";
  return `_bet_completions() {
  local cur="${dollar}{${cw}[${cc}]}"

  if (( ${cc} == 1 )); then
    COMPREPLY=(\$(compgen -W "${subcommandsList}" -- "${dollar}cur"))
    return
  fi

  local cmd="${dollar}{${cw}[1]}"
  if [[ "${dollar}cmd" == "go" || "${dollar}cmd" == "path" || "${dollar}cmd" == "info" ]]; then
    if (( ${cc} == 2 )); then
      local slugs
      slugs=\$(command bet completion --list 2>/dev/null)
      COMPREPLY=(\$(compgen -W "${dollar}slugs" -- "${dollar}cur"))
    fi
  fi
}
complete -F _bet_completions bet
`;
}

export function registerCompletion(program: Command): void {
  program
    .command("completion [shell]")
    .description("Print shell completion script for project name autocompletion")
    .option("--list", "Print project slugs only (for use by completion script)")
    .option("--prefix <prefix>", "Filter slugs by prefix")
    .action(
      async (
        shell: string | undefined,
        options: { list?: boolean; prefix?: string },
      ) => {
        if (options.list) {
          let slugs = await getProjectSlugs();
          if (options.prefix?.length) {
            const p = options.prefix.toLowerCase();
            slugs = slugs.filter((s) => s.toLowerCase().startsWith(p));
          }
          for (const slug of slugs) {
            process.stdout.write(`${slug}\n`);
          }
          return;
        }

        const sh = shell?.toLowerCase() ?? "";
        if (sh === "zsh") {
          process.stdout.write(zshScript());
          return;
        }
        if (sh === "bash") {
          process.stdout.write(bashScript());
          return;
        }

        if (shell !== undefined) {
          process.stderr.write(
            `Unknown shell "${shell}". Use bash or zsh.\n`,
          );
          process.exitCode = 1;
          return;
        }

        process.stderr.write(
          "Usage: bet completion [bash|zsh]\n  eval \"$(bet completion zsh)\"\n",
        );
        process.exitCode = 1;
      },
    );
}
