import { Body, Controller, Get, NotFoundException, Put, Req } from "@nestjs/common";
import { Request } from "express";

import { ProfileService } from "./profile.service";
import { UpsertProfileDto } from "./profile.dto";

@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@Req() request: Request) {
    const tenantId = request.tenantId!;
    const profile = await this.profileService.getProfile(tenantId);

    if (!profile) {
      throw new NotFoundException("Profile not configured");
    }

    return profile;
  }

  @Put()
  async upsertProfile(@Req() request: Request, @Body() dto: UpsertProfileDto) {
    const tenantId = request.tenantId!;
    return this.profileService.upsertProfile(tenantId, dto);
  }
}
