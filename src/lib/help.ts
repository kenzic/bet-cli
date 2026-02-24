import { Help } from "commander";
import type { Command } from "commander";

const GROUP_1: string[] = ["list", "search", "info", "go", "path"];
const GROUP_2: string[] = ["shell", "completion"];
const GROUP_3: string[] = ["update", "ignore", "help"];

const GROUPS: { heading: string; names: string[] }[] = [
  { heading: "Projects", names: GROUP_1 },
  { heading: "Shell integration", names: GROUP_2 },
  { heading: "Index & config", names: GROUP_3 },
];

function getGroupIndex(cmdName: string): number {
  for (let i = 0; i < GROUPS.length; i++) {
    if (GROUPS[i].names.includes(cmdName)) return i;
  }
  return GROUPS.length; // unlisted commands go last
}

/**
 * Custom Help that renders top-level commands in three groups with headings.
 */
export class GroupedHelp extends Help {
  override formatHelp(cmd: Command, helper: Help): string {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth ?? 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 2;

    const formatItem = (term: string, description: string): string => {
      if (description) {
        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
        return helper.wrap(
          fullText,
          helpWidth - itemIndentWidth,
          termWidth + itemSeparatorWidth,
        );
      }
      return term;
    };

    const formatList = (textArray: string[]): string =>
      textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));

    const output: string[] = [];

    // Usage
    output.push(`Usage: ${helper.commandUsage(cmd)}`, "");

    // Description
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output.push(helper.wrap(commandDescription, helpWidth, 0), "");
    }

    // Arguments
    const argumentList = helper.visibleArguments(cmd).map((argument) =>
      formatItem(
        helper.argumentTerm(argument),
        helper.argumentDescription(argument),
      ),
    );
    if (argumentList.length > 0) {
      output.push("Arguments:", formatList(argumentList), "");
    }

    // Options
    const optionList = helper.visibleOptions(cmd).map((option) =>
      formatItem(
        helper.optionTerm(option),
        helper.optionDescription(option),
      ),
    );
    if (optionList.length > 0) {
      output.push("Options:", formatList(optionList), "");
    }

    if (this.showGlobalOptions) {
      const globalOptionList = helper
        .visibleGlobalOptions(cmd)
        .map((option) =>
          formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option),
          ),
        );
      if (globalOptionList.length > 0) {
        output.push("Global Options:", formatList(globalOptionList), "");
      }
    }

    // Commands (grouped)
    const visibleCommands = helper.visibleCommands(cmd);
    if (visibleCommands.length > 0) {
      const byGroup = new Map<number, Command[]>();
      for (const sub of visibleCommands) {
        const name = sub.name();
        const idx = getGroupIndex(name);
        const list = byGroup.get(idx) ?? [];
        list.push(sub);
        byGroup.set(idx, list);
      }

      const groupIndices = [...byGroup.keys()].sort((a, b) => a - b);
      for (const idx of groupIndices) {
        const commands = byGroup.get(idx)!;
        const heading =
          idx < GROUPS.length ? GROUPS[idx].heading : "Commands";
        const commandList = commands.map((sub) =>
          formatItem(
            helper.subcommandTerm(sub),
            helper.subcommandDescription(sub),
          ),
        );
        output.push(`${heading}:`, formatList(commandList), "");
      }
    }

    return output.join("\n");
  }
}
