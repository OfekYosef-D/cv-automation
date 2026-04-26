import { Body, Controller, Get, Put, Req } from "@nestjs/common";
import { Request } from "express";
import { JobAlertListItemDto, JobAlertPreferenceResponseDto, UpdateJobAlertPreferenceDto } from "./job-alerts.dto";
import { JobAlertsService } from "./job-alerts.service";

@Controller("alerts")
export class JobAlertsController {
  constructor(private readonly jobAlertsService: JobAlertsService) {}

  @Get()
  listAlerts(@Req() request: Request): Promise<JobAlertListItemDto[]> {
    return this.jobAlertsService.listAlerts(request.tenantId!);
  }

  @Get("preferences")
  getPreference(@Req() request: Request): Promise<JobAlertPreferenceResponseDto> {
    return this.jobAlertsService.getPreference(request.tenantId!);
  }

  @Put("preferences")
  updatePreference(
    @Req() request: Request,
    @Body() dto: UpdateJobAlertPreferenceDto
  ): Promise<JobAlertPreferenceResponseDto> {
    return this.jobAlertsService.updatePreference(request.tenantId!, dto);
  }
}
