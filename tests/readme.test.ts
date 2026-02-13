import { describe, it, expect, vi } from "vitest";
import { readReadmeDescription } from "../src/lib/readme.js";

vi.mock("node:fs/promises", () => ({
  default: {
    access: vi.fn(),
    readFile: vi.fn(),
  },
}));

describe("readme", () => {
  describe("readReadmeDescription", () => {
    it("returns title when only heading present", async () => {
      const fs = await import("node:fs/promises");
      vi.mocked(fs.default.access).mockResolvedValueOnce(undefined);
      vi.mocked(fs.default.readFile).mockResolvedValueOnce("# My Project\n");

      const result = await readReadmeDescription("/some/project");
      expect(result).toBe("My Project");
    });

    it("returns first paragraph after title", async () => {
      const fs = await import("node:fs/promises");
      vi.mocked(fs.default.access).mockResolvedValueOnce(undefined);
      vi.mocked(fs.default.readFile).mockResolvedValueOnce(
        "# Title\n\nFirst paragraph here.\n\nSecond.\n"
      );

      const result = await readReadmeDescription("/some/project");
      expect(result).toBe("First paragraph here.");
    });

    it("skips content inside code fences", async () => {
      const fs = await import("node:fs/promises");
      vi.mocked(fs.default.access).mockResolvedValueOnce(undefined);
      vi.mocked(fs.default.readFile).mockResolvedValueOnce(
        "# Title\n\nReal paragraph.\n\n```\ncode block\n```\n\nAfter.\n"
      );

      const result = await readReadmeDescription("/some/project");
      expect(result).toBe("Real paragraph.");
    });

    it("returns undefined when no readme", async () => {
      const fs = await import("node:fs/promises");
      vi.mocked(fs.default.access).mockRejectedValue(new Error("not found"));

      const result = await readReadmeDescription("/no/readme");
      expect(result).toBeUndefined();
    });
  });
});
