import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { AppConfig, Config, ProjectsConfig } from "./types.js";
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

async function readAppConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as AppConfig;
    return {
      ...DEFAULT_APP_CONFIG,
      ...parsed,
      roots: parsed.roots ?? [],
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

export async function readConfig(): Promise<Config> {
  const [appConfig, projectsConfig] = await Promise.all([
    readAppConfig(),
    readProjectsConfig(),
  ]);
  return {
    ...appConfig,
    ...projectsConfig,
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
  };
  const projectsConfig: ProjectsConfig = {
    projects: config.projects,
  };
  await Promise.all([
    writeAppConfig(appConfig),
    writeProjectsConfig(projectsConfig),
  ]);
}

export function resolveRoots(inputRoots: string[]): string[] {
  const seen = new Set<string>();
  const resolved: string[] = [];
  for (const root of inputRoots) {
    const abs = normalizeAbsolute(root);
    if (!seen.has(abs)) {
      seen.add(abs);
      resolved.push(abs);
    }
  }
  return resolved;
}
