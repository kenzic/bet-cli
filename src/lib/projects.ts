import path from 'node:path';
import { Config, Project } from './types.js';

export function listProjects(config: Config): Project[] {
  const projects = Object.values(config.projects);
  return projects.sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return a.slug.localeCompare(b.slug);
  });
}

export function groupLabel(project: Project): string {
  return `${project.group}`;
}

export function projectLabel(project: Project): string {
  return `${project.group}/${project.slug}`;
}

export function findBySlug(projects: Project[], slug: string): Project[] {
  const normalized = slug.trim().toLowerCase();
  return projects.filter((project) => project.slug.toLowerCase() === normalized);
}

export function computeGroup(root: string, projectPath: string): string {
  const rel = path.relative(root, projectPath);
  if (!rel) return path.basename(root);
  const [first] = rel.split(path.sep);
  return first || path.basename(root);
}
