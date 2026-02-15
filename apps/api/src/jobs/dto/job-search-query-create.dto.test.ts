import "reflect-metadata";
import { validate } from "class-validator";
import { JobSearchQueryCreateDto } from "./job-search-query-create.dto";

describe("JobSearchQueryCreateDto validation", () => {
  it("rejects empty query", async () => {
    const dto = new JobSearchQueryCreateDto();
    dto.query = "";

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
