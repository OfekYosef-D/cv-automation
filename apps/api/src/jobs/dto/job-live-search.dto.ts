import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import {
  JOB_SEARCH_PROVIDERS,
  JOB_SEARCH_SOURCE_ORIGINS,
  JobSearchProvider,
  JobSearchSourceOrigin
} from "./job-search-query.dto";

export class JobLiveSearchDto {
  @IsIn(JOB_SEARCH_PROVIDERS)
  provider!: JobSearchProvider;

  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  seniority?: string;

  @IsOptional()
  @IsIn(JOB_SEARCH_SOURCE_ORIGINS)
  sourceOrigin?: JobSearchSourceOrigin;

  @IsOptional()
  @IsString({ each: true })
  includeKeywords?: string[];

  @IsOptional()
  @IsString({ each: true })
  excludeKeywords?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  relatedTitles?: boolean;

  @IsOptional()
  @Type(() => Number)
  postedWithinHours?: number;

  @IsOptional()
  @Type(() => Number)
  maxResultsPerRun?: number;

  @IsOptional()
  @Type(() => Number)
  minMatchScore?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  useProfile?: boolean;
}
