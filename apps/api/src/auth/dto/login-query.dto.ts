import { IsIn, IsOptional } from "class-validator";

export class LoginQueryDto {
  @IsOptional()
  @IsIn(["sign-up", "sign-in"])
  screen?: string;
}
