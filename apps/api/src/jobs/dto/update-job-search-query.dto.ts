import { PartialType } from "@nestjs/mapped-types";
import { JobSearchQueryDto } from "./job-search-query.dto";

export class UpdateJobSearchQueryDto extends PartialType(JobSearchQueryDto) {}
