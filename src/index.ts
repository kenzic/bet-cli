#!/usr/bin/env node
import { Command } from "commander";
import { registerUpdate } from "./commands/update.js";
import { registerList } from "./commands/list.js";
import { registerSearch } from "./commands/search.js";
import { registerInfo } from "./commands/info.js";
import { registerGo } from "./commands/go.js";
import { registerPath } from "./commands/path.js";
import { registerShell } from "./commands/shell.js";

const program = new Command();

program
  .name("bet")
  .description("Explore and jump between local projects.")
  .version("0.1.0");

registerUpdate(program);
registerList(program);
registerSearch(program);
registerInfo(program);
registerGo(program);
registerPath(program);
registerShell(program);

program.parseAsync(process.argv);
