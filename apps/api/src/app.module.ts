import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";

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
import { ProfileController } from "./profile/profile.controller";
import { ProfileService } from "./profile/profile.service";

@Module({
  imports: [AuthModule],
  controllers: [
    HealthController,
    MeController,
    ArtefactsController,
    MatchingController,
    ApprovalsController,
    JobsController,
    ProfileController
  ],
  providers: [ArtefactsService, MatchingService, ApprovalsService, JobsService, ProfileService]
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
