import { IsNotEmpty, IsString } from "class-validator";

export class ApprovalActionDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;
}
