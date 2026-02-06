import { existsSync } from "fs";
import { resolve } from "path";

export function resolveEnvPath(): string {
  const cwdEnv = resolve(process.cwd(), ".env");
  if (existsSync(cwdEnv)) {
    return cwdEnv;
  }

  const repoRootEnv = resolve(process.cwd(), "..", "..", ".env");
  if (existsSync(repoRootEnv)) {
    return repoRootEnv;
  }

  return cwdEnv;
}
