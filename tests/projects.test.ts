import { describe, it, expect } from "vitest";
import path from "node:path";
import {
  listProjects,
  findBySlug,
  projectLabel,
} from "../src/lib/projects.js";
import type { Config, Project } from "../src/lib/types.js";

const makeProject = (overrides: Partial<Project>): Project => ({
  id: "/root/a",
  slug: "a",
  name: "a",
  path: "/root/a",
  root: "/root",
  rootName: "root",
  hasGit: true,
  hasReadme: true,
  auto: { lastIndexedAt: new Date().toISOString() },
  ...overrides,
});

describe("projects", () => {
  describe("listProjects", () => {
    it("returns projects sorted by rootName then slug", () => {
      const config: Config = {
        version: 1,
        roots: [],
        projects: {
          "/root/c": makeProject({ path: "/root/c", slug: "c", rootName: "root" }),
          "/root/a": makeProject({ path: "/root/a", slug: "a", rootName: "root" }),
          "/other/x": makeProject({ path: "/other/x", slug: "x", rootName: "other" }),
        },
      };
      const list = listProjects(config);
      expect(list.map((p) => p.slug)).toEqual(["x", "a", "c"]);
      expect(list.map((p) => p.rootName)).toEqual(["other", "root", "root"]);
    });
  });

  describe("findBySlug", () => {
    it("returns exact slug match (case-insensitive)", () => {
      const projects: Project[] = [
        makeProject({ slug: "MyProject", path: "/p1" }),
        makeProject({ slug: "other", path: "/p2" }),
      ];
      expect(findBySlug(projects, "myproject").map((p) => p.path)).toEqual(["/p1"]);
    });

    it("trims slug", () => {
      const projects: Project[] = [makeProject({ slug: "a", path: "/a" })];
      expect(findBySlug(projects, "  a  ").length).toBe(1);
    });

    it("returns empty when no match", () => {
      const projects: Project[] = [makeProject({ slug: "x", path: "/x" })];
      expect(findBySlug(projects, "y")).toEqual([]);
    });
  });

  describe("projectLabel", () => {
    it("returns rootName/slug", () => {
      const p = makeProject({ rootName: "g", slug: "s" });
      expect(projectLabel(p)).toBe("g/s");
    });
  });
});
