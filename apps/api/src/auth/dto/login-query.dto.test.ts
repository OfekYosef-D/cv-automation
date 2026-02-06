import "reflect-metadata";
import { validate } from "class-validator";
import { LoginQueryDto } from "./login-query.dto";

describe("LoginQueryDto validation", () => {
  it("rejects invalid screen values", async () => {
    const dto = new LoginQueryDto();
    dto.screen = "invalid";

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
