import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import { isPathIgnored } from "../src/lib/ignore.js";
import { Command } from "commander";
import * as config from "../src/lib/config.js";

vi.mock("../src/lib/config.js", () => ({
  readConfig: vi.fn(),
  writeConfig: vi.fn(),
}));

import { registerIgnore } from "../src/commands/ignore.js";

describe("ignore lib", () => {
  describe("isPathIgnored", () => {
    it("returns true when project path equals an ignored path", () => {
      const ignoredPaths = [path.resolve("/code/foo"), path.resolve("/code/bar")];
      expect(isPathIgnored(path.resolve("/code/foo"), ignoredPaths)).toBe(true);
      expect(isPathIgnored(path.resolve("/code/bar"), ignoredPaths)).toBe(true);
    });

    it("returns true when project path is under an ignored path", () => {
      const ignoredPaths = [path.resolve("/code/foo")];
      expect(isPathIgnored(path.resolve("/code/foo/nested"), ignoredPaths)).toBe(true);
      expect(isPathIgnored(path.resolve("/code/foo/nested/deep"), ignoredPaths)).toBe(true);
    });

    it("returns false when project path is not in list and not under any entry", () => {
      const ignoredPaths = [path.resolve("/code/foo")];
      expect(isPathIgnored(path.resolve("/code/bar"), ignoredPaths)).toBe(false);
      expect(isPathIgnored(path.resolve("/code"), ignoredPaths)).toBe(false);
      expect(isPathIgnored(path.resolve("/other/foo"), ignoredPaths)).toBe(false);
    });

    it("returns false when ignoredPaths is empty", () => {
      expect(isPathIgnored(path.resolve("/code/foo"), [])).toBe(false);
    });
  });
});

describe("ignore command", () => {
  beforeEach(() => {
    vi.mocked(config.readConfig).mockReset();
    vi.mocked(config.writeConfig).mockReset();
    process.exitCode = undefined;
  });

  async function runIgnore(args: string[]): Promise<string> {
    const chunks: string[] = [];
    const stdoutWrite = process.stdout.write.bind(process.stdout);
    const stderrWrite = process.stderr.write.bind(process.stderr);
    process.stdout.write = (chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    };
    process.stderr.write = (chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    };
    const program = new Command();
    program.name("bet").version("0.1.0");
    registerIgnore(program);
    await program.parseAsync(["node", "bet", "ignore", ...args]);
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
    return chunks.join("");
  }

  it("ignore add fails when no roots configured", async () => {
    vi.mocked(config.readConfig).mockResolvedValue({
      version: 1,
      roots: [],
      projects: {},
    } as Awaited<ReturnType<typeof config.readConfig>>);

    await runIgnore(["add", "/code/foo"]);

    expect(config.writeConfig).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("ignore add fails when path is not under any root", async () => {
    const codeRoot = path.resolve("/code");
    vi.mocked(config.readConfig).mockResolvedValue({
      version: 1,
      roots: [{ path: codeRoot, name: "code" }],
      projects: {},
    } as Awaited<ReturnType<typeof config.readConfig>>);

    await runIgnore(["add", "/other/foo"]);

    expect(config.writeConfig).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("ignore add persists path when under a root", async () => {
    const codeRoot = path.resolve("/code");
    vi.mocked(config.readConfig).mockResolvedValue({
      version: 1,
      roots: [{ path: codeRoot, name: "code" }],
      projects: {},
    } as Awaited<ReturnType<typeof config.readConfig>>);

    await runIgnore(["add", path.join(codeRoot, "my-project")]);

    expect(config.writeConfig).toHaveBeenCalledTimes(1);
    const written = vi.mocked(config.writeConfig).mock.calls[0][0];
    expect(written.ignoredPaths).toContain(path.resolve(codeRoot, "my-project"));
  });

  it("ignore add --this uses current folder", async () => {
    const codeRoot = path.resolve("/code");
    const cwd = path.join(codeRoot, "current-project");
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(cwd);
    vi.mocked(config.readConfig).mockResolvedValue({
      version: 1,
      roots: [{ path: codeRoot, name: "code" }],
      projects: {},
    } as Awaited<ReturnType<typeof config.readConfig>>);

    await runIgnore(["add", "--this"]);

    cwdSpy.mockRestore();
    expect(config.writeConfig).toHaveBeenCalledTimes(1);
    const written = vi.mocked(config.writeConfig).mock.calls[0][0];
    expect(written.ignoredPaths).toContain(cwd);
  });

  it("ignore add errors when no path and no --this", async () => {
    await runIgnore(["add"]);

    expect(config.writeConfig).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("ignore rm removes path from list", async () => {
    const codeRoot = path.resolve("/code");
    const ignoredPath = path.join(codeRoot, "foo");
    vi.mocked(config.readConfig).mockResolvedValue({
      version: 1,
      roots: [{ path: codeRoot, name: "code" }],
      projects: {},
      ignoredPaths: [ignoredPath],
    } as Awaited<ReturnType<typeof config.readConfig>>);

    await runIgnore(["rm", ignoredPath]);

    expect(config.writeConfig).toHaveBeenCalledTimes(1);
    const written = vi.mocked(config.writeConfig).mock.calls[0][0];
    expect(written.ignoredPaths).toBeUndefined();
  });

  it("ignore list prints each ignored path", async () => {
    const codeRoot = path.resolve("/code");
    vi.mocked(config.readConfig).mockResolvedValue({
      version: 1,
      roots: [],
      projects: {},
      ignoredPaths: [path.join(codeRoot, "a"), path.join(codeRoot, "b")],
    } as Awaited<ReturnType<typeof config.readConfig>>);

    const out = await runIgnore(["list"]);

    expect(out).toContain(path.join(codeRoot, "a"));
    expect(out).toContain(path.join(codeRoot, "b"));
  });

  it("ignore list prints nothing when no ignores", async () => {
    vi.mocked(config.readConfig).mockResolvedValue({
      version: 1,
      roots: [],
      projects: {},
    } as Awaited<ReturnType<typeof config.readConfig>>);

    const out = await runIgnore(["list"]);

    expect(out).toBe("");
  });
});
