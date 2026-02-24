import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import { scanRoots } from "../src/lib/scan.js";
import { DEFAULT_IGNORES } from "../src/lib/ignore.js";

const mockFg = vi.fn();
vi.mock("fast-glob", () => ({
  default: (...args: unknown[]) => mockFg(...args),
}));

const mockIsInsideGitRepo = vi.fn();
vi.mock("../src/lib/git.js", () => ({
  isInsideGitRepo: (cwd: string) => mockIsInsideGitRepo(cwd),
}));

describe("scan", () => {
  beforeEach(() => {
    mockFg.mockReset();
    mockIsInsideGitRepo.mockReset();
    mockIsInsideGitRepo.mockResolvedValue(false);
  });

  it("returns candidates from .git matches", async () => {
    const root = path.resolve("/tmp/scan-root");
    mockFg
      .mockResolvedValueOnce(["proj/.git"])
      .mockResolvedValueOnce([]);
    const result = await scanRoots([root], DEFAULT_IGNORES);
    expect(result.length).toBe(1);
    expect(result[0].path).toBe(path.join(root, "proj"));
    expect(result[0].hasGit).toBe(true);
  });

  it("returns candidates from README matches", async () => {
    const root = path.resolve("/tmp/scan-root");
    mockFg
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["other/README.md"]);
    const result = await scanRoots([root], DEFAULT_IGNORES);
    expect(result.length).toBe(1);
    expect(result[0].path).toBe(path.join(root, "other"));
    expect(result[0].hasReadme).toBe(true);
  });

  it("filters nested projects", async () => {
    const root = path.resolve("/tmp/scan-root");
    mockFg
      .mockResolvedValueOnce(["parent/.git", "parent/child/.git"])
      .mockResolvedValueOnce([]);
    const result = await scanRoots([root], DEFAULT_IGNORES);
    expect(result.length).toBe(1);
    expect(result[0].path).toBe(path.join(root, "parent"));
  });

  it("sets hasGit true when isInsideGitRepo returns true for candidate without .git", async () => {
    const root = path.resolve("/tmp/scan-root");
    mockFg
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["nested/README.md"]);
    const projectPath = path.join(root, "nested");
    mockIsInsideGitRepo.mockImplementation((cwd: string) =>
      Promise.resolve(cwd === projectPath)
    );
    const result = await scanRoots([root], DEFAULT_IGNORES);
    expect(result.length).toBe(1);
    expect(result[0].hasGit).toBe(true);
  });
});
