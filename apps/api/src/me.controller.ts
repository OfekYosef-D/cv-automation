import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";

import { AuthGuard } from "./auth/auth.guard";

@Controller()
export class MeController {
  @UseGuards(AuthGuard)
  @Get("me")
  getMe(@Req() request: Request) {
    return {
      tenantId: request.tenantId,
      userId: request.userId
    };
  }
}
