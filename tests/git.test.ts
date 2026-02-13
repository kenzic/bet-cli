import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFile = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
}));

vi.mock("node:util", () => ({
  promisify: (fn: (...args: unknown[]) => Promise<{ stdout: string; stderr: string }>) => fn,
}));

describe("git", () => {
  beforeEach(() => {
    mockExecFile.mockReset();
    vi.resetModules();
  });

  describe("getFirstCommitDate", () => {
    it("returns first commit date when git succeeds", async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: "2020-01-15T10:00:00Z\n", stderr: "" });
      const { getFirstCommitDate } = await import("../src/lib/git.js");
      const result = await getFirstCommitDate("/some/repo");
      expect(result).toBe("2020-01-15T10:00:00Z");
    });

    it("returns undefined when git fails", async () => {
      mockExecFile.mockRejectedValueOnce(new Error("not a repo"));
      const { getFirstCommitDate } = await import("../src/lib/git.js");
      const result = await getFirstCommitDate("/not/repo");
      expect(result).toBeUndefined();
    });
  });

  describe("getDirtyStatus", () => {
    it("returns true when porcelain output non-empty", async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: " M file\n", stderr: "" });
      const { getDirtyStatus } = await import("../src/lib/git.js");
      const result = await getDirtyStatus("/repo");
      expect(result).toBe(true);
    });

    it("returns false when porcelain output empty", async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: "", stderr: "" });
      const { getDirtyStatus } = await import("../src/lib/git.js");
      const result = await getDirtyStatus("/repo");
      expect(result).toBe(false);
    });

    it("returns undefined when git fails", async () => {
      mockExecFile.mockRejectedValueOnce(new Error("not a repo"));
      const { getDirtyStatus } = await import("../src/lib/git.js");
      const result = await getDirtyStatus("/repo");
      expect(result).toBeUndefined();
    });
  });

  describe("isInsideGitRepo", () => {
    it("returns true when rev-parse outputs true", async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: "true\n", stderr: "" });
      const { isInsideGitRepo } = await import("../src/lib/git.js");
      const result = await isInsideGitRepo("/repo");
      expect(result).toBe(true);
    });

    it("returns false when rev-parse fails or outputs else", async () => {
      mockExecFile.mockRejectedValueOnce(new Error("not a repo"));
      const { isInsideGitRepo } = await import("../src/lib/git.js");
      const result = await isInsideGitRepo("/repo");
      expect(result).toBe(false);
    });
  });
});
