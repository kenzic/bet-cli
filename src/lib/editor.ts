import { spawn } from "node:child_process";

export type LaunchCommand = {
  command: string;
  args: string[];
};

function tokenizeCommand(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && /\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escaped || inSingle || inDouble) {
    throw new Error("Invalid editor command in config.");
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

export function parseEditorCommand(editor: string): LaunchCommand {
  const trimmed = editor.trim();
  if (!trimmed) {
    throw new Error("Config editor must not be empty.");
  }

  const tokens = tokenizeCommand(trimmed);
  if (tokens.length === 0) {
    throw new Error("Config editor must not be empty.");
  }

  const [command, ...args] = tokens;
  return { command, args };
}

export function getSystemOpenCommand(
  targetPath: string,
  platform: NodeJS.Platform = process.platform,
): LaunchCommand {
  if (platform === "darwin") {
    return { command: "open", args: [targetPath] };
  }

  if (platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", targetPath] };
  }

  return { command: "xdg-open", args: [targetPath] };
}

function getEnvEditor(env: NodeJS.ProcessEnv): string | undefined {
  const visual = env.VISUAL?.trim();
  if (visual) return visual;

  const editor = env.EDITOR?.trim();
  if (editor) return editor;

  return undefined;
}

function spawnDetached(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });

    child.once("error", (error) => {
      reject(error);
    });

    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function openProjectInEditor(
  projectPath: string,
  configuredEditor?: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const preferredEditor = configuredEditor?.trim() || getEnvEditor(env);
  if (preferredEditor) {
    const parsed = parseEditorCommand(preferredEditor);
    await spawnDetached(parsed.command, [...parsed.args, projectPath]);
    return;
  }

  const fallback = getSystemOpenCommand(projectPath);
  await spawnDetached(fallback.command, fallback.args);
}
