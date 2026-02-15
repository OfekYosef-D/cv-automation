import { IsNotEmpty } from "class-validator";
import { JobSearchQueryDto } from "./job-search-query.dto";

export class JobSearchQueryCreateDto extends JobSearchQueryDto {
  @IsNotEmpty()
  override query!: string;
}
