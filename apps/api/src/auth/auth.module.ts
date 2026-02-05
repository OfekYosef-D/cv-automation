import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { WorkOSAuthGuard } from "./guards/workos-auth.guard";

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, WorkOSAuthGuard],
  exports: [AuthService, WorkOSAuthGuard]
})
export class AuthModule {}
