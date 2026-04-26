import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@cv/db";

import { HealthController } from "./health.controller";
import { AuthModule } from "./auth/auth.module";
import { MeController } from "./me.controller";
import { TenantMiddleware } from "./tenant/tenant.middleware";
import { ArtefactsController } from "./artefacts/artefacts.controller";
import { ArtefactsService } from "./artefacts/artefacts.service";
import { MatchingController } from "./matching/matching.controller";
import { MatchingService } from "./matching/matching.service";
import { ApprovalsController } from "./approvals/approvals.controller";
import { ApprovalsService } from "./approvals/approvals.service";
import { JobsController } from "./jobs/jobs.controller";
import { JobsService } from "./jobs/jobs.service";
import { JobSearchQueryService } from "./jobs/job-search-query.service";
import { JobSearchController } from "./jobs/job-search.controller";
import { JobSearchService } from "./jobs/job-search.service";
import { JobSearchSchedulerService } from "./jobs/job-search-scheduler.service";
import { ProfileController } from "./profile/profile.controller";
import { ProfileService } from "./profile/profile.service";
import { CvController } from "./cv/cv.controller";
import { CvService } from "./cv/cv.service";
import { OpenAiCvGenerationService } from "./cv/openai-cv-generation.service";
import {
  GOOGLE_DOCS_GATEWAY,
  GoogleWorkspaceDocsGateway
} from "./cv/google-docs.gateway";
import { GoogleIntegrationController } from "./integrations/google/google-integration.controller";
import { GoogleIntegrationService } from "./integrations/google/google-integration.service";
import { JobAlertsController } from "./alerts/job-alerts.controller";
import { JobAlertsService } from "./alerts/job-alerts.service";

@Module({
  imports: [AuthModule],
  controllers: [
    HealthController,
    MeController,
    ArtefactsController,
    MatchingController,
    ApprovalsController,
    JobSearchController,
    JobsController,
    JobAlertsController,
    ProfileController,
    CvController,
    GoogleIntegrationController
  ],
  providers: [
    { provide: PrismaClient, useValue: prisma },
    { provide: GOOGLE_DOCS_GATEWAY, useClass: GoogleWorkspaceDocsGateway },
    ArtefactsService,
    MatchingService,
    ApprovalsService,
    JobsService,
    JobSearchSchedulerService,
    JobSearchQueryService,
    JobSearchService,
    JobAlertsService,
    ProfileService,
    GoogleIntegrationService,
    CvService,
    OpenAiCvGenerationService
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Exclude auth routes from tenant middleware (they handle their own auth)
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: "auth/(.*)", method: RequestMethod.ALL },
        { path: "health", method: RequestMethod.GET }
      )
      .forRoutes("*");
  }
}
