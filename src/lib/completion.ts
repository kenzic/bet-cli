import { readConfig } from "./config.js";
import { listProjects } from "./projects.js";

/**
 * Returns project slugs for shell completion. On missing config or error,
 * returns an empty array so the completion path can exit 0 with no output.
 */
export async function getProjectSlugs(): Promise<string[]> {
  try {
    const config = await readConfig();
    const projects = listProjects(config);
    return projects.map((p) => p.slug);
  } catch {
    return [];
  }
}
