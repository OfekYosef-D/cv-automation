import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { AuthGuard } from "./auth/auth.guard";
import { MeController } from "./me.controller";
import { TenantMiddleware } from "./tenant/tenant.middleware";

@Module({
  controllers: [HealthController, MeController],
  providers: [AuthGuard]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
