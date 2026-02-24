import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { readConfig, resolveRoots, getConfigPath, getProjectsPath, writeConfig } from "../src/lib/config.js";
import { getEffectiveIgnores, DEFAULT_IGNORES } from "../src/lib/ignore.js";
import type { RootConfig } from "../src/lib/types.js";

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

describe("config", () => {
  beforeEach(() => {
    vi.mocked(fs.readFile).mockReset();
  });

  describe("readConfig", () => {
    it("migrates legacy string[] roots to RootConfig[]", async () => {
      const configPath = getConfigPath();
      const projectsPath = getProjectsPath();
      vi.mocked(fs.readFile).mockImplementation((p: string) => {
        if (p === configPath) {
          return Promise.resolve(
            JSON.stringify({ version: 1, roots: ["/tmp/foo", "~/bar"] }),
          );
        }
        if (p === projectsPath) {
          return Promise.resolve(JSON.stringify({ projects: {} }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const config = await readConfig();

      expect(config.roots).toHaveLength(2);
      expect(config.roots[0]).toEqual({
        path: path.resolve("/tmp/foo"),
        name: "foo",
      });
      expect(config.roots[1].path).toBe(
        path.resolve(process.env.HOME || "", "bar"),
      );
      expect(config.roots[1].name).toBe("bar");
    });

    it("normalizes rootName on legacy projects that have group but no rootName", async () => {
      const configPath = getConfigPath();
      const projectsPath = getProjectsPath();
      const resolvedRoot = path.resolve("/code");
      vi.mocked(fs.readFile).mockImplementation((p: string) => {
        if (p === configPath) {
          return Promise.resolve(
            JSON.stringify({
              version: 1,
              roots: [{ path: resolvedRoot, name: "my-code" }],
            }),
          );
        }
        if (p === projectsPath) {
          return Promise.resolve(
            JSON.stringify({
              projects: {
                "/code/app": {
                  id: "/code/app",
                  slug: "app",
                  name: "app",
                  path: "/code/app",
                  root: resolvedRoot,
                  group: "legacy-group",
                  hasGit: true,
                  hasReadme: true,
                  auto: { lastIndexedAt: "2020-01-01T00:00:00.000Z" },
                },
              },
            }),
          );
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const config = await readConfig();

      const project = config.projects["/code/app"];
      expect(project).toBeDefined();
      expect(project.rootName).toBe("my-code");
      expect((project as { group?: string }).group).toBeUndefined();
    });

    it("returns ignores when set in config", async () => {
      const configPath = getConfigPath();
      const projectsPath = getProjectsPath();
      vi.mocked(fs.readFile).mockImplementation((p: string) => {
        if (p === configPath) {
          return Promise.resolve(
            JSON.stringify({
              version: 1,
              roots: [],
              ignores: ["**/foo/**", "**/bar"],
            }),
          );
        }
        if (p === projectsPath) {
          return Promise.resolve(JSON.stringify({ projects: {} }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const config = await readConfig();

      expect(config.ignores).toEqual(["**/foo/**", "**/bar"]);
    });

    it("leaves ignores undefined when not in config", async () => {
      const configPath = getConfigPath();
      const projectsPath = getProjectsPath();
      vi.mocked(fs.readFile).mockImplementation((p: string) => {
        if (p === configPath) {
          return Promise.resolve(JSON.stringify({ version: 1, roots: [] }));
        }
        if (p === projectsPath) {
          return Promise.resolve(JSON.stringify({ projects: {} }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const config = await readConfig();

      expect(config.ignores).toBeUndefined();
    });

    it("returns slugParentFolders when set in config", async () => {
      const configPath = getConfigPath();
      const projectsPath = getProjectsPath();
      vi.mocked(fs.readFile).mockImplementation((p: string) => {
        if (p === configPath) {
          return Promise.resolve(
            JSON.stringify({
              version: 1,
              roots: [],
              slugParentFolders: ["src", "app", "packages"],
            }),
          );
        }
        if (p === projectsPath) {
          return Promise.resolve(JSON.stringify({ projects: {} }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const config = await readConfig();

      expect(config.slugParentFolders).toEqual(["src", "app", "packages"]);
    });

    it("leaves slugParentFolders undefined when not in config", async () => {
      const configPath = getConfigPath();
      const projectsPath = getProjectsPath();
      vi.mocked(fs.readFile).mockImplementation((p: string) => {
        if (p === configPath) {
          return Promise.resolve(JSON.stringify({ version: 1, roots: [] }));
        }
        if (p === projectsPath) {
          return Promise.resolve(JSON.stringify({ projects: {} }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const config = await readConfig();

      expect(config.slugParentFolders).toBeUndefined();
    });

    it("reads and normalizes ignoredPaths from config", async () => {
      const configPath = getConfigPath();
      const projectsPath = getProjectsPath();
      const resolvedPath = path.resolve("/code/some-project");
      vi.mocked(fs.readFile).mockImplementation((p: string) => {
        if (p === configPath) {
          return Promise.resolve(
            JSON.stringify({
              version: 1,
              roots: [],
              ignoredPaths: ["/code/some-project", "~/other"],
            }),
          );
        }
        if (p === projectsPath) {
          return Promise.resolve(JSON.stringify({ projects: {} }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const config = await readConfig();

      expect(config.ignoredPaths).toBeDefined();
      expect(config.ignoredPaths).toHaveLength(2);
      expect(config.ignoredPaths![0]).toBe(resolvedPath);
      expect(config.ignoredPaths![1]).toBe(path.resolve(process.env.HOME || "", "other"));
    });

    it("leaves ignoredPaths undefined when not in config", async () => {
      const configPath = getConfigPath();
      const projectsPath = getProjectsPath();
      vi.mocked(fs.readFile).mockImplementation((p: string) => {
        if (p === configPath) {
          return Promise.resolve(JSON.stringify({ version: 1, roots: [] }));
        }
        if (p === projectsPath) {
          return Promise.resolve(JSON.stringify({ projects: {} }));
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const config = await readConfig();

      expect(config.ignoredPaths).toBeUndefined();
    });
  });

  describe("getEffectiveIgnores", () => {
    it("returns DEFAULT_IGNORES when config has no ignores", () => {
      expect(getEffectiveIgnores({})).toEqual(DEFAULT_IGNORES);
    });

    it("returns only user ignores when config.ignores is set (no merge)", () => {
      expect(getEffectiveIgnores({ ignores: ["x"] })).toEqual(["x"]);
    });
  });

  describe("resolveRoots", () => {
    it("deduplicates by path and normalizes RootConfig", () => {
      const input: RootConfig[] = [
        { path: "/a/b", name: "b" },
        { path: "/a/b", name: "other" },
        { path: "/c", name: "c" },
      ];
      const result = resolveRoots(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: path.resolve("/a/b"), name: "b" });
      expect(result[1]).toEqual({ path: path.resolve("/c"), name: "c" });
    });
  });

  describe("writeConfig", () => {
    it("writes ignoredPaths to app config when present", async () => {
      const configPath = getConfigPath();
      const projectsPath = getProjectsPath();
      vi.mocked(fs.readFile).mockImplementation((p: string) => {
        if (p === configPath) {
          return Promise.resolve(JSON.stringify({ version: 1, roots: [] }));
        }
        if (p === projectsPath) {
          return Promise.resolve(JSON.stringify({ projects: {} }));
        }
        return Promise.reject(new Error("ENOENT"));
      });
      const config = await readConfig();
      const configWithIgnores = {
        ...config,
        ignoredPaths: [path.resolve("/code/foo"), path.resolve("/code/bar")],
      };

      await writeConfig(configWithIgnores);

      expect(fs.writeFile).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining('"ignoredPaths"'),
        "utf8",
      );
      const written = JSON.parse(
        String(vi.mocked(fs.writeFile).mock.calls.find((c) => c[0] === configPath)![1]),
      );
      expect(written.ignoredPaths).toEqual([path.resolve("/code/foo"), path.resolve("/code/bar")]);
    });
  });
});
