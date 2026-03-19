import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { getSystemOpenCommand, openProjectInEditor, parseEditorCommand } from "../src/lib/editor.js";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "node:child_process";

type SpawnedProcess = EventEmitter & {
  unref: ReturnType<typeof vi.fn>;
};

function createSpawnedProcess(): SpawnedProcess {
  const child = new EventEmitter() as SpawnedProcess;
  child.unref = vi.fn();
  return child;
}

describe("editor", () => {
  beforeEach(() => {
    vi.mocked(spawn).mockReset();
  });

  describe("parseEditorCommand", () => {
    it("parses command and args", () => {
      expect(parseEditorCommand("code -n")).toEqual({
        command: "code",
        args: ["-n"],
      });
    });

    it("handles quoted args", () => {
      expect(parseEditorCommand('cursor --profile "Work Profile"')).toEqual({
        command: "cursor",
        args: ["--profile", "Work Profile"],
      });
    });

    it("throws for malformed command", () => {
      expect(() => parseEditorCommand('code "unterminated')).toThrow(
        "Invalid editor command in config.",
      );
    });
  });

  describe("getSystemOpenCommand", () => {
    it("returns open on macOS", () => {
      expect(getSystemOpenCommand("/tmp/project", "darwin")).toEqual({
        command: "open",
        args: ["/tmp/project"],
      });
    });

    it("returns cmd start on windows", () => {
      expect(getSystemOpenCommand("C:\\tmp\\project", "win32")).toEqual({
        command: "cmd",
        args: ["/c", "start", "", "C:\\tmp\\project"],
      });
    });

    it("returns xdg-open on linux", () => {
      expect(getSystemOpenCommand("/tmp/project", "linux")).toEqual({
        command: "xdg-open",
        args: ["/tmp/project"],
      });
    });
  });

  describe("openProjectInEditor", () => {
    it("uses configured editor command with project path", async () => {
      const child = createSpawnedProcess();
      vi.mocked(spawn).mockReturnValue(child as never);

      const openPromise = openProjectInEditor("/tmp/project", "code -n");
      child.emit("spawn");
      await openPromise;

      expect(spawn).toHaveBeenCalledWith("code", ["-n", "/tmp/project"], {
        detached: true,
        stdio: "ignore",
      });
      expect(child.unref).toHaveBeenCalledTimes(1);
    });

    it("falls back to system opener when editor is not configured", async () => {
      const child = createSpawnedProcess();
      vi.mocked(spawn).mockReturnValue(child as never);

      const openPromise = openProjectInEditor("/tmp/project", undefined, {});
      child.emit("spawn");
      await openPromise;

      expect(spawn).toHaveBeenCalledTimes(1);
      expect(child.unref).toHaveBeenCalledTimes(1);
    });

    it("uses VISUAL when config editor is not set", async () => {
      const child = createSpawnedProcess();
      vi.mocked(spawn).mockReturnValue(child as never);

      const openPromise = openProjectInEditor(
        "/tmp/project",
        undefined,
        { VISUAL: "nvim" },
      );
      child.emit("spawn");
      await openPromise;

      expect(spawn).toHaveBeenCalledWith("nvim", ["/tmp/project"], {
        detached: true,
        stdio: "ignore",
      });
      expect(child.unref).toHaveBeenCalledTimes(1);
    });

    it("uses EDITOR when VISUAL is not set", async () => {
      const child = createSpawnedProcess();
      vi.mocked(spawn).mockReturnValue(child as never);

      const openPromise = openProjectInEditor(
        "/tmp/project",
        undefined,
        { EDITOR: "vim -p" },
      );
      child.emit("spawn");
      await openPromise;

      expect(spawn).toHaveBeenCalledWith("vim", ["-p", "/tmp/project"], {
        detached: true,
        stdio: "ignore",
      });
      expect(child.unref).toHaveBeenCalledTimes(1);
    });

    it("prefers VISUAL over EDITOR", async () => {
      const child = createSpawnedProcess();
      vi.mocked(spawn).mockReturnValue(child as never);

      const openPromise = openProjectInEditor(
        "/tmp/project",
        undefined,
        { VISUAL: "nvim", EDITOR: "vim" },
      );
      child.emit("spawn");
      await openPromise;

      expect(spawn).toHaveBeenCalledWith("nvim", ["/tmp/project"], {
        detached: true,
        stdio: "ignore",
      });
      expect(child.unref).toHaveBeenCalledTimes(1);
    });

    it("throws when spawn fails", async () => {
      const child = createSpawnedProcess();
      vi.mocked(spawn).mockReturnValue(child as never);

      const openPromise = openProjectInEditor("/tmp/project", "code");
      const error = new Error("missing executable");
      child.emit("error", error);

      await expect(openPromise).rejects.toThrow("missing executable");
    });
  });
});
