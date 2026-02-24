import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { AppConfig, Config, ProjectsConfig, RootConfig } from "./types.js";
import { normalizeAbsolute } from "../utils/paths.js";

const CONFIG_DIR = process.env.XDG_CONFIG_HOME
  ? path.join(process.env.XDG_CONFIG_HOME, "bet")
  : path.join(os.homedir(), ".config", "bet");

const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const PROJECTS_PATH = path.join(CONFIG_DIR, "projects.json");

const DEFAULT_APP_CONFIG: AppConfig = {
  version: 1,
  roots: [],
};

const DEFAULT_PROJECTS_CONFIG: ProjectsConfig = {
  projects: {},
};

const DEFAULT_CONFIG: Config = {
  ...DEFAULT_APP_CONFIG,
  ...DEFAULT_PROJECTS_CONFIG,
};

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function getProjectsPath(): string {
  return PROJECTS_PATH;
}

function normalizeRoots(parsedRoots: unknown): RootConfig[] {
  if (!Array.isArray(parsedRoots)) return [];
  const result: RootConfig[] = [];
  for (const r of parsedRoots) {
    if (typeof r === "string") {
      const abs = normalizeAbsolute(r);
      result.push({ path: abs, name: path.basename(abs) });
    } else if (r && typeof r === "object" && "path" in r && typeof (r as RootConfig).path === "string") {
      const root = r as RootConfig;
      const abs = normalizeAbsolute(root.path);
      const name = (root.name?.trim() || path.basename(abs));
      result.push({ path: abs, name });
    }
  }
  return result;
}

function normalizeIgnores(parsed: unknown): string[] | undefined {
  if (!Array.isArray(parsed)) return undefined;
  const list = parsed.filter((x): x is string => typeof x === "string");
  return list;
}

function normalizeSlugParentFolders(parsed: unknown): string[] | undefined {
  if (!Array.isArray(parsed)) return undefined;
  const list = parsed.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
  return list.length === 0 ? undefined : list;
}

function normalizeIgnoredPaths(parsed: unknown): string[] | undefined {
  if (!Array.isArray(parsed)) return undefined;
  const list = parsed.filter((x): x is string => typeof x === "string").map((x) => normalizeAbsolute(x));
  return list.length === 0 ? undefined : list;
}

async function readAppConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as { version?: number; roots?: unknown; ignores?: unknown; ignoredPaths?: unknown; slugParentFolders?: unknown };
    const roots = normalizeRoots(parsed.roots ?? []);
    const ignores = normalizeIgnores(parsed.ignores);
    const ignoredPaths = normalizeIgnoredPaths(parsed.ignoredPaths);
    const slugParentFolders = normalizeSlugParentFolders(parsed.slugParentFolders);
    return {
      ...DEFAULT_APP_CONFIG,
      version: parsed.version ?? 1,
      roots,
      ...(ignores !== undefined && { ignores }),
      ...(ignoredPaths !== undefined && { ignoredPaths }),
      ...(slugParentFolders !== undefined && { slugParentFolders }),
    };
  } catch (error) {
    return { ...DEFAULT_APP_CONFIG };
  }
}

async function readProjectsConfig(): Promise<ProjectsConfig> {
  try {
    const raw = await fs.readFile(PROJECTS_PATH, "utf8");
    const parsed = JSON.parse(raw) as ProjectsConfig;
    return {
      projects: parsed.projects ?? {},
    };
  } catch (error) {
    return { ...DEFAULT_PROJECTS_CONFIG };
  }
}

function normalizeProjectRootName(project: { root: string; rootName?: string; group?: string }, roots: RootConfig[]): string {
  if (project.rootName?.trim()) return project.rootName.trim();
  const matched = roots.find((r) => r.path === project.root);
  if (matched) return matched.name;
  return path.basename(project.root);
}

export async function readConfig(): Promise<Config> {
  const [appConfig, projectsConfig] = await Promise.all([
    readAppConfig(),
    readProjectsConfig(),
  ]);
  const projects = projectsConfig.projects;
  const normalizedProjects: Record<string, import("./types.js").Project> = {};
  for (const [id, p] of Object.entries(projects)) {
    const rootName = normalizeProjectRootName(p, appConfig.roots);
    const { group: _group, ...rest } = p as import("./types.js").Project & { group?: string };
    normalizedProjects[id] = { ...rest, rootName } as import("./types.js").Project;
  }
  return {
    ...appConfig,
    projects: normalizedProjects,
  };
}

async function writeAppConfig(appConfig: AppConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const formatted = JSON.stringify(appConfig, null, 2);
  await fs.writeFile(CONFIG_PATH, formatted, "utf8");
}

async function writeProjectsConfig(
  projectsConfig: ProjectsConfig,
): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const formatted = JSON.stringify(projectsConfig, null, 2);
  await fs.writeFile(PROJECTS_PATH, formatted, "utf8");
}

export async function writeConfig(config: Config): Promise<void> {
  const appConfig: AppConfig = {
    version: config.version,
    roots: config.roots,
    ...(config.ignores !== undefined && { ignores: config.ignores }),
    ...(config.ignoredPaths !== undefined && { ignoredPaths: config.ignoredPaths }),
    ...(config.slugParentFolders !== undefined && { slugParentFolders: config.slugParentFolders }),
  };
  const projectsConfig: ProjectsConfig = {
    projects: config.projects,
  };
  await Promise.all([
    writeAppConfig(appConfig),
    writeProjectsConfig(projectsConfig),
  ]);
}

export function resolveRoots(inputRoots: RootConfig[]): RootConfig[] {
  const seen = new Set<string>();
  const resolved: RootConfig[] = [];
  for (const root of inputRoots) {
    const abs = normalizeAbsolute(root.path);
    if (!seen.has(abs)) {
      seen.add(abs);
      resolved.push({ path: abs, name: root.name?.trim() || path.basename(abs) });
    }
  }
  return resolved;
}
