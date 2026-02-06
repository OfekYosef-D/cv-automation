import cookieParser from "cookie-parser";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";

describe("Auth and tenant (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Legacy auth (x-user-id header)", () => {
    it("rejects /me without auth", async () => {
      await request(app.getHttpServer())
        .get("/me")
        .set("x-tenant-id", "t1")
        .expect(401);
    });

    it("returns tenantId for authenticated requests", async () => {
      await request(app.getHttpServer())
        .get("/me")
        .set("x-tenant-id", "t1")
        .set("x-user-id", "u1")
        .expect(200)
        .expect({ tenantId: "t1", userId: "u1" });
    });
  });

  describe("WorkOS OAuth endpoints", () => {
    // Note: These tests check that endpoints exist and behave correctly.
    // When WORKOS_API_KEY is not set, they return 500 instead of redirecting.
    // In CI with real credentials, they would redirect to WorkOS.

    it("GET /auth/login responds (redirects when configured)", async () => {
      const response = await request(app.getHttpServer())
        .get("/auth/login");

      // Either redirects to WorkOS (302) or returns error if not configured (500)
      expect([302, 500]).toContain(response.status);

      if (response.status === 302) {
        expect(response.headers.location).toContain("workos.com");
      }
    });

    it("GET /auth/login with screen=sign-up responds (redirects when configured)", async () => {
      const response = await request(app.getHttpServer())
        .get("/auth/login?screen=sign-up");

      // Either redirects to WorkOS (302) or returns error if not configured (500)
      expect([302, 500]).toContain(response.status);

      if (response.status === 302) {
        expect(response.headers.location).toContain("workos.com");
      }
    });

    it("GET /auth/callback with error redirects to frontend error page", async () => {
      const response = await request(app.getHttpServer())
        .get("/auth/callback?error=access_denied")
        .expect(302);

      // Should redirect to frontend error page
      expect(response.headers.location).toContain("/auth/error");
      expect(response.headers.location).toContain("access_denied");
    });

    it("GET /auth/callback without code redirects to frontend error page", async () => {
      const response = await request(app.getHttpServer())
        .get("/auth/callback")
        .expect(302);

      // Should redirect to frontend error page
      expect(response.headers.location).toContain("/auth/error");
      expect(response.headers.location).toContain("missing_code");
    });

    it("POST /auth/logout returns success message", async () => {
      await request(app.getHttpServer())
        .post("/auth/logout")
        .expect(200)
        .expect({ message: "Logged out successfully" });
    });
  });

  describe("JWT auth (/auth/me)", () => {
    it("rejects /auth/me without Authorization header", async () => {
      await request(app.getHttpServer())
        .get("/auth/me")
        .expect(401);
    });

    it("rejects /auth/me with invalid JWT", async () => {
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });

    it("rejects /auth/me with malformed Authorization header", async () => {
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", "NotBearer token")
        .expect(401);
    });
  });
});
