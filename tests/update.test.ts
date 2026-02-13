import { describe, it, expect } from "vitest";
import { willOverrideRoots } from "../src/commands/update.js";
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
});
