import type { User } from "@prisma/client";

export {};

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      user?: User;
    }
  }
}
