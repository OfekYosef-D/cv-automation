import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { AuthGuard } from "./auth/auth.guard";
import { MeController } from "./me.controller";
import { TenantMiddleware } from "./tenant/tenant.middleware";
import { ArtefactsController } from "./artefacts/artefacts.controller";
import { ArtefactsService } from "./artefacts/artefacts.service";
import { MatchingController } from "./matching/matching.controller";
import { MatchingService } from "./matching/matching.service";

@Module({
  controllers: [HealthController, MeController, ArtefactsController, MatchingController],
  providers: [AuthGuard, ArtefactsService, MatchingService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
