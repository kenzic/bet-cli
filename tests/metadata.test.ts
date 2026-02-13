import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeMetadata } from "../src/lib/metadata.js";

const mockFg = vi.fn();
vi.mock("fast-glob", () => ({
  default: (...args: unknown[]) => mockFg(...args),
}));

vi.mock("../src/lib/readme.js", () => ({
  readReadmeDescription: vi.fn(),
}));

vi.mock("../src/lib/git.js", () => ({
  getFirstCommitDate: vi.fn(),
  getDirtyStatus: vi.fn(),
}));

describe("metadata", () => {
  beforeEach(async () => {
    mockFg.mockReset();
    const readme = await import("../src/lib/readme.js");
    const git = await import("../src/lib/git.js");
    vi.mocked(readme.readReadmeDescription).mockResolvedValue(undefined);
    vi.mocked(git.getFirstCommitDate).mockResolvedValue(undefined);
    vi.mocked(git.getDirtyStatus).mockResolvedValue(undefined);
  });

  it("returns lastIndexedAt and uses file mtimes for started/lastModified when no git", async () => {
    const now = new Date();
    mockFg.mockResolvedValueOnce([
      { stats: { mtimeMs: now.getTime() - 10000 } },
      { stats: { mtimeMs: now.getTime() - 5000 } },
    ]);
    const result = await computeMetadata("/some/project", false);
    expect(result.lastIndexedAt).toBeDefined();
    expect(result.startedAt).toBeDefined();
    expect(result.lastModifiedAt).toBeDefined();
    expect(result.description).toBeUndefined();
    expect(result.dirty).toBeUndefined();
  });

  it("uses getFirstCommitDate and getDirtyStatus when hasGit", async () => {
    mockFg.mockResolvedValueOnce([]);
    const git = await import("../src/lib/git.js");
    vi.mocked(git.getFirstCommitDate).mockResolvedValue("2021-06-01T00:00:00Z");
    vi.mocked(git.getDirtyStatus).mockResolvedValue(true);
    const readme = await import("../src/lib/readme.js");
    vi.mocked(readme.readReadmeDescription).mockResolvedValue("A cool project");

    const result = await computeMetadata("/repo", true);
    expect(result.startedAt).toBe("2021-06-01T00:00:00Z");
    expect(result.dirty).toBe(true);
    expect(result.description).toBe("A cool project");
  });
});
