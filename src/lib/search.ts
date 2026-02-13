import Fuse from 'fuse.js';
import { Project } from './types.js';

export function searchProjects(projects: Project[], query: string): Project[] {
  if (!query.trim()) return projects;
  const fuse = new Fuse(projects, {
    keys: [
      'slug',
      'name',
      'path',
      'rootName',
      'root',
      'user.tags',
      'user.description',
      'auto.description'
    ],
    includeScore: true,
    threshold: 0.4,
  });

  return fuse.search(query).map((result) => result.item);
}
