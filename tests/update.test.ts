import { describe, it, expect } from "vitest";
import { willOverrideRoots, projectSlug, DEFAULT_SLUG_PARENT_FOLDERS } from "../src/commands/update.js";
import type { RootConfig } from "../src/lib/types.js";

const root = (path: string, name: string): RootConfig => ({ path, name });

describe("update", () => {
  describe("willOverrideRoots", () => {
    it("returns true when --roots provided and config has roots", () => {
      expect(
        willOverrideRoots(
          [root("/a", "a")],
          [root("/b", "b")],
        ),
      ).toBe(true);
    });

    it("returns false when --roots not provided", () => {
      expect(willOverrideRoots(undefined, [root("/b", "b")])).toBe(false);
    });

    it("returns false when config has no roots", () => {
      expect(willOverrideRoots([root("/a", "a")], [])).toBe(false);
    });

    it("returns false when neither provided nor config roots", () => {
      expect(willOverrideRoots(undefined, [])).toBe(false);
    });
  });

  describe("projectSlug", () => {
    it("uses parent name when path ends with default slugParentFolders (src, app)", () => {
      expect(projectSlug("/code/my-api/src", DEFAULT_SLUG_PARENT_FOLDERS)).toBe("my-api");
      expect(projectSlug("/code/my-api/app", DEFAULT_SLUG_PARENT_FOLDERS)).toBe("my-api");
    });

    it("uses basename when path does not end with default slugParentFolders", () => {
      expect(projectSlug("/code/my-api/other", DEFAULT_SLUG_PARENT_FOLDERS)).toBe("other");
      expect(projectSlug("/code/my-api", DEFAULT_SLUG_PARENT_FOLDERS)).toBe("my-api");
    });

    it("uses custom slugParentFolders when provided", () => {
      const custom = ["lib"];
      expect(projectSlug("/code/my-api/lib", custom)).toBe("my-api");
      expect(projectSlug("/code/my-api/src", custom)).toBe("src");
      expect(projectSlug("/code/my-api/app", custom)).toBe("app");
    });
  });
});
