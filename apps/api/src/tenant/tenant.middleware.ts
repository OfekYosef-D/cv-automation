import {
  BadRequestException,
  Injectable,
  NestMiddleware
} from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.header("x-tenant-id");

    if (!tenantId) {
      throw new BadRequestException("Missing tenant id");
    }

    req.tenantId = tenantId;
    next();
  }
}
