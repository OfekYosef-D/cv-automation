import { Injectable, UnauthorizedException } from "@nestjs/common";
import { WorkOS, User as WorkOSUser } from "@workos-inc/node";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { prisma } from "@cv/db";
import { AuthProvider, User } from "@prisma/client";

// Lazy-initialized instances
let workos: WorkOS | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getWorkOS(): WorkOS {
  if (!workos) {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) {
      throw new Error("WORKOS_API_KEY environment variable is required");
    }
    workos = new WorkOS(apiKey);
  }
  return workos;
}

function getJWKS() {
  if (!jwks) {
    const clientId = process.env.WORKOS_CLIENT_ID;
    jwks = createRemoteJWKSet(
      new URL(`https://api.workos.com/sso/jwks/${clientId}`)
    );
  }
  return jwks;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  workosId: string | null;
}

@Injectable()
export class AuthService {
  /**
   * Generate WorkOS authorization URL for login.
   */
  getAuthorizationUrl(screenHint?: "sign-up" | "sign-in"): string {
    const clientId = process.env.WORKOS_CLIENT_ID!;
    const redirectUri = `${process.env.API_URL ?? "http://localhost:3001"}/auth/callback`;

    return getWorkOS().userManagement.getAuthorizationUrl({
      clientId,
      redirectUri,
      provider: "authkit",
      screenHint
    });
  }

  /**
   * Exchange authorization code for user and tokens.
   */
  async authenticateWithCode(code: string) {
    const clientId = process.env.WORKOS_CLIENT_ID!;

    const authResponse = await getWorkOS().userManagement.authenticateWithCode({
      code,
      clientId
    });

    return authResponse;
  }

  /**
   * Verify a WorkOS access token using JWKS.
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, getJWKS());
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  /**
   * Sync WorkOS user to our database.
   * Creates tenant and user if they don't exist.
   */
  async syncUser(workosUser: WorkOSUser): Promise<User> {
    // Try to find existing user by WorkOS ID
    let user = await prisma.user.findUnique({
      where: { workosId: workosUser.id }
    });

    if (user) {
      // Update user info
      return prisma.user.update({
        where: { id: user.id },
        data: {
          name: workosUser.firstName
            ? `${workosUser.firstName} ${workosUser.lastName ?? ""}`.trim()
            : user.name,
          avatarUrl: workosUser.profilePictureUrl ?? user.avatarUrl,
          email: workosUser.email
        }
      });
    }

    // Try to find by email (link existing account)
    user = await prisma.user.findUnique({
      where: { email: workosUser.email }
    });

    if (user) {
      // Link WorkOS account to existing user
      return prisma.user.update({
        where: { id: user.id },
        data: {
          workosId: workosUser.id,
          provider: AuthProvider.WORKOS,
          name: workosUser.firstName
            ? `${workosUser.firstName} ${workosUser.lastName ?? ""}`.trim()
            : user.name,
          avatarUrl: workosUser.profilePictureUrl ?? user.avatarUrl
        }
      });
    }

    // Create new tenant and user
    const userName = workosUser.firstName
      ? `${workosUser.firstName} ${workosUser.lastName ?? ""}`.trim()
      : workosUser.email.split("@")[0];

    const tenant = await prisma.tenant.create({
      data: {
        name: userName
      }
    });

    return prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: workosUser.email,
        name: userName,
        avatarUrl: workosUser.profilePictureUrl,
        provider: AuthProvider.WORKOS,
        workosId: workosUser.id
      }
    });
  }

  /**
   * Get user by WorkOS ID (from JWT sub claim).
   */
  async getUserByWorkosId(workosId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { workosId }
    });
  }

  /**
   * Get user by internal ID.
   */
  async getUserById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });
  }
}
