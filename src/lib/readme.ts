import fs from "node:fs/promises";
import path from "node:path";

const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.MD"];

export async function readReadmePath(
  projectPath: string,
): Promise<string | undefined> {
  for (const name of README_NAMES) {
    const candidate = path.join(projectPath, name);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // ignore
    }
  }
  return undefined;
}

export async function readReadmeContent(
  projectPath: string,
): Promise<string | undefined> {
  const readmePath = await readReadmePath(projectPath);
  if (!readmePath) return undefined;

  let content = await fs.readFile(readmePath, "utf8");
  // remove html tags
  content = content.replace(/<[^>]*>?/g, "");

  // only graph the first 300 characters, and add ... if there are more
  const truncated = content.slice(0, 500);
  if (content.length > 500) {
    return `${truncated}...`;
  }
  return truncated;
}

export async function readReadmeDescription(
  projectPath: string,
): Promise<string | undefined> {
  const readmePath = await readReadmePath(projectPath);
  if (!readmePath) return undefined;

  const raw = await fs.readFile(readmePath, "utf8");
  const lines = raw.split(/\r?\n/);

  let title: string | undefined;
  let paragraph: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    if (!title && trimmed.startsWith("#")) {
      title = trimmed.replace(/^#+\s*/, "").trim();
      continue;
    }

    if (title) {
      if (trimmed.length === 0) {
        if (paragraph.length > 0) break;
        continue;
      }
      if (trimmed.startsWith("#")) {
        if (paragraph.length > 0) break;
        continue;
      }
      paragraph.push(trimmed);
    }
  }

  const description = paragraph.join(" ").trim();
  if (description) return description;
  return title || undefined;
}
