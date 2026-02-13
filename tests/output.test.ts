import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { emitSelection } from "../src/utils/output.js";
import type { Project } from "../src/lib/types.js";

const makeProject = (overrides: Partial<Project>): Project => ({
  id: "/root/a",
  slug: "a",
  name: "a",
  path: "/path/to/project",
  root: "/root",
  group: "root",
  hasGit: true,
  hasReadme: true,
  auto: { lastIndexedAt: new Date().toISOString() },
  ...overrides,
});

describe("output", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("writes path only when printOnly is true", () => {
    const project = makeProject({ path: "/my/project" });
    emitSelection(project, { printOnly: true });
    expect(writeSpy).toHaveBeenCalledWith("/my/project\n");
  });

  it("writes path only when BET_EVAL is not 1", () => {
    const orig = process.env.BET_EVAL;
    process.env.BET_EVAL = "0";
    const project = makeProject({ path: "/my/project" });
    emitSelection(project, {});
    expect(writeSpy).toHaveBeenCalledWith("/my/project\n");
    process.env.BET_EVAL = orig;
  });

  it("writes __BET_EVAL__ cd snippet when BET_EVAL=1 and no onEnter", () => {
    const orig = process.env.BET_EVAL;
    process.env.BET_EVAL = "1";
    const project = makeProject({ path: "/my/project" });
    emitSelection(project, {});
    const out = writeSpy.mock.calls.map((c) => c[0]).join("");
    expect(out).toContain("__BET_EVAL__");
    expect(out).toContain('cd "/my/project"');
    process.env.BET_EVAL = orig;
  });

  it("includes onEnter in snippet when BET_EVAL=1 and onEnter set", () => {
    const orig = process.env.BET_EVAL;
    process.env.BET_EVAL = "1";
    const project = makeProject({
      path: "/my/project",
      user: { onEnter: "npm run dev" },
    });
    emitSelection(project, {});
    const out = writeSpy.mock.calls.map((c) => c[0]).join("");
    expect(out).toContain("__BET_EVAL__");
    expect(out).toContain("npm run dev");
    process.env.BET_EVAL = orig;
  });

  it("omits onEnter when noEnter is true", () => {
    const orig = process.env.BET_EVAL;
    process.env.BET_EVAL = "1";
    const project = makeProject({
      path: "/my/project",
      user: { onEnter: "npm run dev" },
    });
    emitSelection(project, { noEnter: true });
    const out = writeSpy.mock.calls.map((c) => c[0]).join("");
    expect(out).not.toContain("npm run dev");
    process.env.BET_EVAL = orig;
  });
});
