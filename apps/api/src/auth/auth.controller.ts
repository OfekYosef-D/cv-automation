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

      const token = authResponse.accessToken;
      const isProd = process.env.NODE_ENV === "production";

      // Set token in HttpOnly cookie (not in URL)
      res.cookie("access_token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "lax" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/"
      });

      res.redirect(`${frontendUrl}/auth/callback`);
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
   * Clears the HttpOnly cookie.
   */
  @Post("logout")
  logout(@Res() res: Response) {
    res.clearCookie("access_token", { path: "/" });
    return res.json({ message: "Logged out successfully" });
  }
}
