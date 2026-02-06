import { AuthController } from "./auth.controller";
import type { AuthService } from "./auth.service";
import type { Request } from "express";

describe("AuthController.getMe", () => {
  it("uses tenantId from middleware instead of req.user", () => {
    const controller = new AuthController({} as AuthService);

    const request = {
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        avatarUrl: null,
        tenantId: "tenant-from-user"
      },
      tenantId: "tenant-from-middleware"
    } as unknown as Request;

    const response = controller.getMe(request);

    expect(response).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
      avatarUrl: null,
      tenantId: "tenant-from-middleware"
    });
  });
});
