import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req
} from "@nestjs/common";
import { Request } from "express";

import {
  ConnectCvTemplateDto,
  GenerateCvDto,
  UpdateCvTemplatePlaceholdersDto,
  UpdateGeneratedCvDraftDto
} from "./cv.dto";
import { CvService } from "./cv.service";

@Controller("cv")
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Get("template")
  async getTemplate(@Req() request: Request) {
    const tenantId = request.tenantId!;
    const template = await this.cvService.getTemplate(tenantId);

    if (!template) {
      throw new NotFoundException("Google Docs template not configured");
    }

    return template;
  }

  @Get("default")
  async getDefaultTemplate(@Req() request: Request) {
    return this.getTemplate(request);
  }

  @Post("template/connect")
  connectTemplate(@Req() request: Request, @Body() dto: ConnectCvTemplateDto) {
    return this.cvService.connectTemplate(request.tenantId!, dto);
  }

  @Post("connect/google-doc")
  connectGoogleDocAlias(@Req() request: Request, @Body() dto: ConnectCvTemplateDto) {
    return this.cvService.connectTemplate(request.tenantId!, dto);
  }

  @Put("template/placeholders")
  updateTemplatePlaceholders(
    @Req() request: Request,
    @Body() dto: UpdateCvTemplatePlaceholdersDto
  ) {
    return this.cvService.updateTemplatePlaceholders(
      request.tenantId!,
      dto.placeholders.map((placeholder) => ({
        token: placeholder.token,
        bindingType: placeholder.bindingType,
        sourceKey: placeholder.sourceKey,
        instructions: placeholder.instructions ?? null
      }))
    );
  }

  @Post("generate")
  generateDraft(@Req() request: Request, @Body() dto: GenerateCvDto) {
    return this.cvService.generateDraft(request.tenantId!, dto.jobId, {
      summaryOnly: dto.summaryOnly ?? true
    });
  }

  @Put("generated/:versionId")
  updateDraft(
    @Req() request: Request,
    @Param("versionId") versionId: string,
    @Body() dto: UpdateGeneratedCvDraftDto
  ) {
    return this.cvService.updateDraft(request.tenantId!, versionId, dto.fieldValues);
  }

  @Post("generated/:versionId/sync")
  syncDraft(@Req() request: Request, @Param("versionId") versionId: string) {
    return this.cvService.syncDraft(request.tenantId!, versionId);
  }
}
