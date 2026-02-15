import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";

export const JOB_SEARCH_PROVIDERS = ["serpapi", "jsearch", "adzuna"] as const;

export type JobSearchProvider = (typeof JOB_SEARCH_PROVIDERS)[number];

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
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3600)
  cadenceSeconds?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
