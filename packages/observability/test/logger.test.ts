import { describe, expect, it } from "vitest";

import { createLogger } from "../src/logger";

describe("createLogger", () => {
  it("returns a logger instance", () => {
    const logger = createLogger();

    expect(typeof logger.info).toBe("function");
  });
});
