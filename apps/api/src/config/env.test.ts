import * as fs from "fs";
import { resolve, join, sep } from "path";

import { resolveEnvPath } from "./env";

jest.mock("fs", () => {
  const actual = jest.requireActual("fs");
  return {
    ...actual,
    existsSync: jest.fn()
  };
});

describe("resolveEnvPath", () => {
  const baseCwd = join(sep, "repo", "apps", "api");
  const repoRoot = join(sep, "repo");

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it("prefers .env in the current working directory", () => {
    const cwdEnv = resolve(baseCwd, ".env");
    const rootEnv = resolve(repoRoot, ".env");

    jest.spyOn(process, "cwd").mockReturnValue(baseCwd);
    (fs.existsSync as jest.Mock).mockImplementation((path) => {
      const pathValue = String(path);
      if (pathValue === cwdEnv) return true;
      if (pathValue === rootEnv) return true;
      return false;
    });

    expect(resolveEnvPath()).toBe(cwdEnv);
  });

  it("falls back to the repo root when cwd has no .env", () => {
    const cwdEnv = resolve(baseCwd, ".env");
    const rootEnv = resolve(repoRoot, ".env");

    jest.spyOn(process, "cwd").mockReturnValue(baseCwd);
    (fs.existsSync as jest.Mock).mockImplementation((path) => {
      const pathValue = String(path);
      if (pathValue === cwdEnv) return false;
      if (pathValue === rootEnv) return true;
      return false;
    });

    expect(resolveEnvPath()).toBe(rootEnv);
  });
});
