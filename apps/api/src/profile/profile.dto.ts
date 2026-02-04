import { ArrayNotEmpty, IsArray, IsIn, IsNotEmpty, IsString } from "class-validator";

export type Seniority = "junior" | "mid" | "senior";

export class UpsertProfileDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  desiredRoles!: string[];

  @IsString()
  @IsNotEmpty()
  @IsIn(["junior", "mid", "senior"])
  seniority!: Seniority;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  mustHaveSkills!: string[];
}

export interface ProfileResponseDto {
  id: string;
  desiredRoles: string[];
  seniority: Seniority;
  location: string;
  mustHaveSkills: string[];
  createdAt: string;
  updatedAt: string;
}
