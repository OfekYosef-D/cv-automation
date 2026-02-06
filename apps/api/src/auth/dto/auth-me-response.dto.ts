export class AuthMeResponseDto {
  id!: string;
  email!: string;
  name!: string | null;
  avatarUrl!: string | null;
  tenantId!: string;
}
