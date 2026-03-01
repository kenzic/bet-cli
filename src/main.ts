import { Command } from "commander";
import { GroupedHelp } from "./lib/help.js";
import { registerUpdate } from "./commands/update.js";
import { registerList } from "./commands/list.js";
import { registerSearch } from "./commands/search.js";
import { registerInfo } from "./commands/info.js";
import { registerGo } from "./commands/go.js";
import { registerPath } from "./commands/path.js";
import { registerShell } from "./commands/shell.js";
import { registerCompletion } from "./commands/completion.js";
import { registerIgnore } from "./commands/ignore.js";

const ASCII_HEADER = `
                            ░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░
                        ░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░   ░░░░░░                                 ░░░░░░
                ░░░░░░░░░░░░░░░░░   ░░░░░░                                 ░░░░░░
            ░░░░░░░░░░░░░   ░░░░░   ░░░░░░                                 ░░░░░░
        ░░░░░░░░░░░░░       ░░░░░   ░░░░░░                                 ░░░░░░
      ░░░░░░░░░░░░          ░░░░░   ░░░░░░                                 ░░░░░░
         ░░░░░░░░░░░░░░░░   ░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░             ░░░░░░
              ░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░             ░░░░░░
                   ░░░░░░░░░░░░░░   ░░░░░░                                 ░░░░░░
                        ░░░░░░░░░   ░░░░░░                                 ░░░░░░
                            ░░░░░   ░░░░░░                                 ░░░░░░
                            ░░░░░   ░░░░░░                                 ░░░░░░
                            ░░░░░   ░░░░░░                                 ░░░░░░
       ░░░░░░░░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░             ░░░░░░
       ░░░░░░░░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░             ░░░░░░
`;

const program = new Command();

program.createHelp = function createHelp(this: Command) {
  return Object.assign(new GroupedHelp(), this.configureHelp());
};

program
  .name("bet")
  .description("Explore and jump between local projects.")
  .version("0.2.0");

registerUpdate(program);
registerList(program);
registerSearch(program);
registerInfo(program);
registerGo(program);
registerPath(program);
registerShell(program);
registerCompletion(program);
registerIgnore(program);

program.addHelpText("before", ASCII_HEADER);

program.parseAsync(process.argv);
