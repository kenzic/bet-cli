export type ProjectAutoMetadata = {
  description?: string;
  startedAt?: string;
  lastModifiedAt?: string;
  lastIndexedAt: string;
  dirty?: boolean;
};

export type ProjectUserMetadata = {
  description?: string;
  onEnter?: string;
  tags?: string[];
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  path: string;
  root: string;
  rootName: string;
  hasGit: boolean;
  hasReadme: boolean;
  auto: ProjectAutoMetadata;
  user?: ProjectUserMetadata;
};

export type RootConfig = {
  path: string;
  name: string;
};

export type AppConfig = {
  version: number;
  roots: RootConfig[];
};

export type ProjectsConfig = {
  projects: Record<string, Project>;
};

export type Config = {
  version: number;
  roots: RootConfig[];
  projects: Record<string, Project>;
};

export type ProjectCandidate = {
  path: string;
  root: string;
  hasGit: boolean;
  hasReadme: boolean;
};
