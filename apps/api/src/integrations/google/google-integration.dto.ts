export interface GoogleIntegrationStatusResponseDto {
  connected: boolean;
  email: string | null;
  expiresAt: string | null;
  scopes: string[];
}

export interface GoogleConnectionStartResponseDto {
  url: string;
}
