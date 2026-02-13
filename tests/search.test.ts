import { describe, it, expect } from "vitest";
import { searchProjects } from "../src/lib/search.js";
import type { Project } from "../src/lib/types.js";

const makeProject = (overrides: Partial<Project>): Project => ({
  id: "/root/a",
  slug: "a",
  name: "a",
  path: "/root/a",
  root: "/root",
  group: "root",
  hasGit: true,
  hasReadme: true,
  auto: { lastIndexedAt: new Date().toISOString() },
  ...overrides,
});

describe("search", () => {
  const projects: Project[] = [
    makeProject({ slug: "api-server", name: "API Server", path: "/code/api-server" }),
    makeProject({ slug: "web-app", name: "Web App", path: "/code/web-app" }),
    makeProject({ slug: "payments", name: "Payments", path: "/code/payments" }),
  ];

  it("returns all projects when query is blank", () => {
    expect(searchProjects(projects, "")).toEqual(projects);
    expect(searchProjects(projects, "   ")).toEqual(projects);
  });

  it("returns fuzzy matches for slug", () => {
    const results = searchProjects(projects, "api");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((p) => p.slug === "api-server")).toBe(true);
  });

  it("returns matches for partial name", () => {
    const results = searchProjects(projects, "payment");
    expect(results.some((p) => p.slug === "payments")).toBe(true);
  });

  it("returns empty when no match", () => {
    const results = searchProjects(projects, "xyznonexistent");
    expect(results).toEqual([]);
  });
});
