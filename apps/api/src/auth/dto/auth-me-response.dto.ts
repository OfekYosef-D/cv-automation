import { IsEmail, IsOptional, IsString, IsUUID, IsUrl } from "class-validator";

export class AuthMeResponseDto {
  @IsUUID()
  id!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name!: string | null;

  @IsOptional()
  @IsString()
  @IsUrl()
  avatarUrl!: string | null;

  @IsUUID()
  tenantId!: string;
}
