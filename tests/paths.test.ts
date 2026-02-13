import { describe, it, expect } from "vitest";
import path from "node:path";
import { expandHome, normalizeAbsolute, isSubpath } from "../src/utils/paths.js";

describe("paths", () => {
  describe("expandHome", () => {
    it("returns empty string unchanged", () => {
      expect(expandHome("")).toBe("");
    });

    it("expands ~ to absolute homedir", () => {
      const result = expandHome("~");
      expect(path.isAbsolute(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("expands ~/path to homedir + path", () => {
      const home = expandHome("~");
      expect(expandHome("~/code")).toBe(path.join(home, "code"));
    });

    it("returns other paths unchanged", () => {
      expect(expandHome("/abs/path")).toBe("/abs/path");
      expect(expandHome("relative")).toBe("relative");
    });
  });

  describe("normalizeAbsolute", () => {
    it("resolves path with expanded home", () => {
      const result = normalizeAbsolute("~/x");
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toBe(path.resolve(expandHome("~"), "x"));
    });

    it("resolves relative path", () => {
      const result = normalizeAbsolute(".");
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe("isSubpath", () => {
    it("returns true when child is under parent", () => {
      expect(isSubpath("/a/b/c", "/a")).toBe(true);
      expect(isSubpath("/a/b", "/a")).toBe(true);
    });

    it("returns false when paths are the same", () => {
      expect(isSubpath("/a", "/a")).toBe(false);
    });

    it("returns false when child is not under parent", () => {
      expect(isSubpath("/a", "/a/b")).toBe(false);
      expect(isSubpath("/x/y", "/a")).toBe(false);
    });

    it("returns false when child goes up from parent", () => {
      expect(isSubpath("/a/../b", "/a")).toBe(false);
    });
  });
});
