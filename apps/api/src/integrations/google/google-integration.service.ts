import crypto from "node:crypto";
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";

import type {
  GoogleConnectionStartResponseDto,
  GoogleIntegrationStatusResponseDto
} from "./google-integration.dto";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive"
] as const;

interface GoogleOAuthState {
  tenantId: string;
  issuedAt: number;
}

@Injectable()
export class GoogleIntegrationService {
  constructor(private readonly prismaClient: PrismaClient) {}

  async getStatus(tenantId: string): Promise<GoogleIntegrationStatusResponseDto> {
    const connection = await this.prismaClient.googleConnection.findUnique({
      where: { tenantId }
    });

    if (!connection || connection.revokedAt) {
      return {
        connected: false,
        email: null,
        expiresAt: null,
        scopes: []
      };
    }

    return {
      connected: true,
      email: connection.email,
      expiresAt: connection.accessTokenExpiresAt?.toISOString() ?? null,
      scopes: connection.scopes
    };
  }

  async startConnection(tenantId: string): Promise<GoogleConnectionStartResponseDto> {
    const client = this.createOAuthClient();
    const state = this.signState({
      tenantId,
      issuedAt: Date.now()
    });

    const url = client.generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      prompt: "consent",
      scope: [...GOOGLE_SCOPES],
      state
    });

    return { url };
  }

  async handleCallback(code: string, state: string): Promise<string> {
    const payload = this.verifyState(state);
    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const userInfo = google.oauth2({ version: "v2", auth: client });
    const { data } = await userInfo.userinfo.get();
    const email = data.email;

    if (!email) {
      throw new ServiceUnavailableException("Google account email was not returned.");
    }

    const existingConnection = await this.prismaClient.googleConnection.findUnique({
      where: { tenantId: payload.tenantId }
    });

    const refreshToken = tokens.refresh_token ?? this.decryptRefreshToken(existingConnection?.refreshTokenCiphertext);
    if (!refreshToken) {
      throw new ServiceUnavailableException("Google did not return a refresh token.");
    }

    await this.prismaClient.googleConnection.upsert({
      where: { tenantId: payload.tenantId },
      create: {
        tenantId: payload.tenantId,
        email,
        refreshTokenCiphertext: this.encryptRefreshToken(refreshToken),
        scopes: [...GOOGLE_SCOPES],
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        connectedAt: new Date(),
        revokedAt: null
      },
      update: {
        email,
        refreshTokenCiphertext: this.encryptRefreshToken(refreshToken),
        scopes: [...GOOGLE_SCOPES],
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        connectedAt: new Date(),
        revokedAt: null
      }
    });

    return this.buildFrontendRedirectUrl("connected");
  }

  async disconnect(tenantId: string): Promise<GoogleIntegrationStatusResponseDto> {
    const connection = await this.prismaClient.googleConnection.findUnique({
      where: { tenantId }
    });

    if (!connection) {
      return {
        connected: false,
        email: null,
        expiresAt: null,
        scopes: []
      };
    }

    await this.prismaClient.googleConnection.update({
      where: { tenantId },
      data: {
        revokedAt: new Date()
      }
    });

    return {
      connected: false,
      email: null,
      expiresAt: null,
      scopes: []
    };
  }

  async getAuthorizedClient(
    tenantId: string
  ): Promise<InstanceType<typeof google.auth.OAuth2>> {
    const connection = await this.prismaClient.googleConnection.findUnique({
      where: { tenantId }
    });

    if (!connection || connection.revokedAt) {
      throw new BadRequestException("Google account not connected for this tenant.");
    }

    const refreshToken = this.decryptRefreshToken(connection.refreshTokenCiphertext);
    if (!refreshToken) {
      throw new ServiceUnavailableException("Stored Google refresh token is invalid.");
    }

    const client = this.createOAuthClient();
    client.setCredentials({
      refresh_token: refreshToken
    });

    return client;
  }

  buildFrontendRedirectUrl(status: "connected" | "error", reason?: string): string {
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const redirectUrl = new URL(frontendUrl);
    redirectUrl.searchParams.set("google", status);
    if (reason) {
      redirectUrl.searchParams.set("google_reason", reason);
    }
    return redirectUrl.toString();
  }

  private createOAuthClient(): InstanceType<typeof google.auth.OAuth2> {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_OAUTH_REDIRECT_URI ??
      `${process.env.API_URL ?? "http://localhost:3001"}/integrations/google/connect/callback`;

    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        "Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET."
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  private getStateSecret(): string {
    const secret = process.env.GOOGLE_OAUTH_STATE_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException(
        "Google OAuth state signing is not configured. Set GOOGLE_OAUTH_STATE_SECRET."
      );
    }

    return secret;
  }

  private getEncryptionKey(): Buffer {
    const rawKey = process.env.APP_ENCRYPTION_KEY;
    if (!rawKey) {
      throw new ServiceUnavailableException(
        "App encryption is not configured. Set APP_ENCRYPTION_KEY."
      );
    }

    return crypto.createHash("sha256").update(rawKey).digest();
  }

  private signState(payload: GoogleOAuthState): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", this.getStateSecret())
      .update(encodedPayload)
      .digest("base64url");

    return `${encodedPayload}.${signature}`;
  }

  private verifyState(state: string): GoogleOAuthState {
    const [encodedPayload, signature] = state.split(".");
    if (!encodedPayload || !signature) {
      throw new BadRequestException("Invalid Google OAuth state.");
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.getStateSecret())
      .update(encodedPayload)
      .digest("base64url");

    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new BadRequestException("Invalid Google OAuth state signature.");
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as GoogleOAuthState;
    if (!payload.tenantId || !payload.issuedAt) {
      throw new BadRequestException("Invalid Google OAuth state payload.");
    }

    const ageMs = Date.now() - payload.issuedAt;
    if (ageMs > 10 * 60 * 1000) {
      throw new BadRequestException("Google OAuth state has expired.");
    }

    return payload;
  }

  private encryptRefreshToken(refreshToken: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
  }

  private decryptRefreshToken(ciphertext?: string | null): string | null {
    if (!ciphertext) {
      return null;
    }

    const [ivPart, tagPart, encryptedPart] = ciphertext.split(".");
    if (!ivPart || !tagPart || !encryptedPart) {
      return null;
    }

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.getEncryptionKey(),
      Buffer.from(ivPart, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, "base64url")),
      decipher.final()
    ]).toString("utf8");
  }
}
