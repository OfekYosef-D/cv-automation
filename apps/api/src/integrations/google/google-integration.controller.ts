import { Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { GoogleIntegrationService } from "./google-integration.service";

@Controller("integrations/google")
export class GoogleIntegrationController {
  constructor(private readonly googleIntegrationService: GoogleIntegrationService) {}

  @Get("status")
  getStatus(@Req() request: Request) {
    return this.googleIntegrationService.getStatus(request.tenantId!);
  }

  @Post("connect/start")
  startConnection(@Req() request: Request) {
    return this.googleIntegrationService.startConnection(request.tenantId!);
  }

  @Get("connect/callback")
  async handleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Res() response: Response
  ) {
    try {
      if (!code || !state) {
        return response.redirect(
          this.googleIntegrationService.buildFrontendRedirectUrl("error", "missing_callback_params")
        );
      }

      const redirectUrl = await this.googleIntegrationService.handleCallback(code, state);
      return response.redirect(redirectUrl);
    } catch {
      return response.redirect(
        this.googleIntegrationService.buildFrontendRedirectUrl("error", "callback_failed")
      );
    }
  }

  @Post("disconnect")
  disconnect(@Req() request: Request) {
    return this.googleIntegrationService.disconnect(request.tenantId!);
  }
}
