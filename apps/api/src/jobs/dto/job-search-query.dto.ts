import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";

export const JOB_SEARCH_PROVIDERS = ["serpapi", "jsearch"] as const;
export const JOB_SEARCH_SOURCE_ORIGINS = ["all", "linkedin"] as const;

export type JobSearchProvider = (typeof JOB_SEARCH_PROVIDERS)[number];
export type JobSearchSourceOrigin = (typeof JOB_SEARCH_SOURCE_ORIGINS)[number];

export class JobSearchQueryDto {
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
  @IsArray()
  @IsString({ each: true })
  includeKeywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[];

  @IsOptional()
  @IsBoolean()
  relatedTitles?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  postedWithinHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxResultsPerRun?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minMatchScore?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  cadenceSeconds?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
