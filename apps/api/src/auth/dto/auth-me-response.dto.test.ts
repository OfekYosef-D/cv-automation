import "reflect-metadata";
import { validate } from "class-validator";
import { AuthMeResponseDto } from "./auth-me-response.dto";

describe("AuthMeResponseDto validation", () => {
  it("fails when required fields are invalid", async () => {
    const dto = new AuthMeResponseDto();
    dto.id = "not-a-uuid";
    dto.email = "not-an-email";
    dto.name = null;
    dto.avatarUrl = "not-a-url";
    dto.tenantId = "also-not-a-uuid";

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it("passes with valid fields", async () => {
    const dto = new AuthMeResponseDto();
    dto.id = "9e1c9c1b-4e33-4e6b-9c15-7c6d9b3af2c4";
    dto.email = "user@example.com";
    dto.name = null;
    dto.avatarUrl = "https://example.com/avatar.png";
    dto.tenantId = "3f52cf44-6d5a-4c36-9c8b-0f5b6db39c15";

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
