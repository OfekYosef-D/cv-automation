import { IsIn, IsOptional, IsString } from "class-validator";
import { JOB_SEARCH_PROVIDERS, JobSearchProvider } from "./job-search-query.dto";

export class JobLiveSearchDto {
  @IsIn(JOB_SEARCH_PROVIDERS)
  provider!: JobSearchProvider;

  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  location?: string;
}
