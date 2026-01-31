import { describe, expect, it } from "vitest";

import { healthCheck } from "../src/health";

describe("healthCheck", () => {
  it("returns ok", () => {
    expect(healthCheck()).toBe("ok");
  });
});
