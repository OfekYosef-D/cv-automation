import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { AuthGuard } from "./auth/auth.guard";
import { MeController } from "./me.controller";
import { TenantMiddleware } from "./tenant/tenant.middleware";
import { ArtefactsController } from "./artefacts/artefacts.controller";
import { ArtefactsService } from "./artefacts/artefacts.service";

@Module({
  controllers: [HealthController, MeController, ArtefactsController],
  providers: [AuthGuard, ArtefactsService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
