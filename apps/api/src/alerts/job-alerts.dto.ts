import { Type } from "class-transformer";
import { IsBoolean, IsEmail, IsInt, IsOptional, Max, Min } from "class-validator";

export interface JobAlertPreferenceResponseDto {
  emailEnabled: boolean;
  emailAddress: string | null;
  immediateAlerts: boolean;
  minMatchScore: number | null;
  cooldownSeconds: number;
}

export class UpdateJobAlertPreferenceDto {
  @IsBoolean()
  @Type(() => Boolean)
  emailEnabled!: boolean;

  @IsOptional()
  @IsEmail()
  emailAddress?: string;

  @IsBoolean()
  @Type(() => Boolean)
  immediateAlerts!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minMatchScore?: number;

  @IsInt()
  @Min(0)
  @Max(86400)
  @Type(() => Number)
  cooldownSeconds!: number;
}

export interface JobAlertListItemDto {
  id: string;
  channel: "EMAIL";
  status: "PENDING" | "SENT" | "FAILED";
  deliveryError: string | null;
  sentAt: string | null;
  createdAt: string;
  jobSearchQueryId: string;
  job: {
    id: string;
    title: string;
    company: string | null;
    location: string | null;
    url: string;
  };
}
