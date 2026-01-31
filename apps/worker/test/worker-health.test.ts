import { describe, expect, it } from "vitest";

import { workerHealth } from "../src/worker-health";

describe("workerHealth", () => {
  it("returns ok", () => {
    expect(workerHealth()).toBe("ok");
  });
});
