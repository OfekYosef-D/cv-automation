import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { WorkOSAuthGuard } from "./guards/workos-auth.guard";
import { LoginQueryDto } from "./dto/login-query.dto";
import { CallbackQueryDto } from "./dto/callback-query.dto";
import { AuthMeResponseDto } from "./dto/auth-me-response.dto";
import { getAuthCookieOptions } from "./auth-cookie";

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  tenantId: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Initiate login flow.
   * Redirects to WorkOS hosted login page.
   */
  @Get("login")
  login(@Res() res: Response, @Query() query: LoginQueryDto): void {
    const { screen } = query;
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
    @Query() query: CallbackQueryDto,
    @Res() res: Response
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const { code, error } = query;

    if (error) {
      // Redirect to frontend with error
      res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code) {
      res.redirect(`${frontendUrl}/auth/error?error=missing_code`);
      return;
    }

    try {
      // Exchange code for user and tokens
      const authResponse = await this.authService.authenticateWithCode(code);

      // Sync user to our database
      await this.authService.syncUser(authResponse.user);

      const token = authResponse.accessToken;
      res.cookie("access_token", token, {
        ...getAuthCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.redirect(`${frontendUrl}/auth/callback`);
      return;
    } catch (err) {
      console.error("Auth callback failed", err);
      res.redirect(`${frontendUrl}/auth/error?error=auth_error`);
      return;
    }
  }

  /**
   * Get current authenticated user.
   * Requires valid JWT token.
   */
  @Get("me")
  @UseGuards(WorkOSAuthGuard)
  getMe(@Req() req: Request): AuthMeResponseDto {
    const { id, email, name, avatarUrl } = req.user as AuthenticatedUser;

    return { id, email, name, avatarUrl, tenantId: req.tenantId! };
  }

  /**
   * Logout endpoint.
   * Clears the HttpOnly cookie.
   */
  @Post("logout")
  logout(@Res() res: Response): Response {
    res.clearCookie("access_token", getAuthCookieOptions());
    return res.json({ message: "Logged out successfully" });
  }
}
