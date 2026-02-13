import { Config, Project } from './types.js';

export function listProjects(config: Config): Project[] {
  const projects = Object.values(config.projects);
  return projects.sort((a, b) => {
    if (a.rootName !== b.rootName) return a.rootName.localeCompare(b.rootName);
    return a.slug.localeCompare(b.slug);
  });
}

export function projectLabel(project: Project): string {
  return `${project.rootName}/${project.slug}`;
}

export function findBySlug(projects: Project[], slug: string): Project[] {
  const normalized = slug.trim().toLowerCase();
  return projects.filter((project) => project.slug.toLowerCase() === normalized);
}
