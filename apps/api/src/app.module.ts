import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { AuthGuard } from "./auth/auth.guard";
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
import { ProfileController } from "./profile/profile.controller";
import { ProfileService } from "./profile/profile.service";

@Module({
  controllers: [
    HealthController,
    MeController,
    ArtefactsController,
    MatchingController,
    ApprovalsController,
    JobsController,
    ProfileController
  ],
  providers: [AuthGuard, ArtefactsService, MatchingService, ApprovalsService, JobsService, ProfileService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
