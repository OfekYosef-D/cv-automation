import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { WorkOSAuthGuard } from "./guards/workos-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Initiate login flow.
   * Redirects to WorkOS hosted login page.
   */
  @Get("login")
  login(@Res() res: Response, @Query("screen") screen?: string) {
    const screenHint = screen === "sign-up" ? "sign-up" : "sign-in";
    const authUrl = this.authService.getAuthorizationUrl(screenHint);
    res.redirect(authUrl);
  }

  /**
   * OAuth callback handler.
   * Exchanges code for tokens and redirects to frontend.
   */
  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("error") error: string,
    @Res() res: Response
  ) {
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

    if (error) {
      // Redirect to frontend with error
      return res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${frontendUrl}/auth/error?error=missing_code`);
    }

    try {
      // Exchange code for user and tokens
      const authResponse = await this.authService.authenticateWithCode(code);

      // Sync user to our database
      await this.authService.syncUser(authResponse.user);

      // Redirect to frontend with access token
      const token = authResponse.accessToken;
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(message)}`);
    }
  }

  /**
   * Get current authenticated user.
   * Requires valid JWT token.
   */
  @Get("me")
  @UseGuards(WorkOSAuthGuard)
  getMe(@Req() req: Request) {
    const user = req.user as {
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
      tenantId: string;
    };

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId
    };
  }

  /**
   * Logout endpoint.
   * For JWT-based auth, the client discards the token.
   * This endpoint exists for explicit logout actions and future session invalidation.
   */
  @Post("logout")
  logout() {
    // JWT tokens are stateless - client should discard the token
    // In the future, we could add token blacklisting here
    return { message: "Logged out successfully" };
  }
}
