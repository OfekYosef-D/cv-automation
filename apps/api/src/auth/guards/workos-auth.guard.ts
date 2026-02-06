import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "../auth.service";

@Injectable()
export class WorkOSAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const cookieToken = request.cookies?.access_token;
    const hasBearer = authHeader?.startsWith("Bearer ") ?? false;
    const token = hasBearer ? authHeader!.slice(7) : cookieToken;

    if (!token && authHeader && !hasBearer) {
      throw new UnauthorizedException("Invalid authorization header format");
    }

    if (!token) {
      throw new UnauthorizedException("Missing authorization token or cookie");
    }

    try {
      // Verify the JWT using WorkOS JWKS
      const payload = await this.authService.verifyAccessToken(token);

      // Get user from database using WorkOS sub claim
      const workosId = payload.sub;
      if (!workosId || typeof workosId !== "string") {
        throw new UnauthorizedException("Invalid token: missing subject claim");
      }
      const user = await this.authService.getUserByWorkosId(workosId);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Set user info on request for downstream use
      request.user = user;
      request.userId = user.id;
      request.tenantId = user.tenantId;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid token");
    }
  }
}
