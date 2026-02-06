import "reflect-metadata";
import { validate } from "class-validator";
import { CallbackQueryDto } from "./callback-query.dto";

describe("CallbackQueryDto validation", () => {
  it("accepts optional code and error", async () => {
    const dto = new CallbackQueryDto();

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
