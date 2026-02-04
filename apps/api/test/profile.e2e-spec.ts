import { INestApplication, MiddlewareConsumer, Module, NestModule, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { prisma } from "@cv/db";

import { ProfileController } from "../src/profile/profile.controller";
import { ProfileService } from "../src/profile/profile.service";
import { TenantMiddleware } from "../src/tenant/tenant.middleware";

@Module({
  controllers: [ProfileController],
  providers: [ProfileService]
})
class TestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}

describe("Profile (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 404 when no profile exists", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "NoProfile" } });

    await request(app.getHttpServer())
      .get("/profile")
      .set("x-tenant-id", tenant.id)
      .expect(404);
  });

  it("creates profile with PUT", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "CreateProfile" } });

    const profileData = {
      desiredRoles: ["fullstack", "backend"],
      seniority: "mid",
      location: "remote",
      mustHaveSkills: ["typescript", "nodejs"]
    };

    const response = await request(app.getHttpServer())
      .put("/profile")
      .set("x-tenant-id", tenant.id)
      .send(profileData)
      .expect(200);

    expect(response.body.desiredRoles).toEqual(["fullstack", "backend"]);
    expect(response.body.seniority).toBe("mid");
    expect(response.body.location).toBe("remote");
    expect(response.body.mustHaveSkills).toEqual(["typescript", "nodejs"]);
    expect(response.body.id).toBeDefined();
    expect(response.body.createdAt).toBeDefined();
    expect(response.body.updatedAt).toBeDefined();
  });

  it("returns profile after creation", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "GetProfile" } });

    await prisma.userProfile.create({
      data: {
        tenantId: tenant.id,
        desiredRoles: ["frontend"],
        seniority: "senior",
        location: "new york",
        mustHaveSkills: ["react", "css"]
      }
    });

    const response = await request(app.getHttpServer())
      .get("/profile")
      .set("x-tenant-id", tenant.id)
      .expect(200);

    expect(response.body.desiredRoles).toEqual(["frontend"]);
    expect(response.body.seniority).toBe("senior");
    expect(response.body.location).toBe("new york");
    expect(response.body.mustHaveSkills).toEqual(["react", "css"]);
  });

  it("updates existing profile with PUT", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "UpdateProfile" } });

    await prisma.userProfile.create({
      data: {
        tenantId: tenant.id,
        desiredRoles: ["devops"],
        seniority: "junior",
        location: "austin",
        mustHaveSkills: ["docker"]
      }
    });

    const updatedData = {
      desiredRoles: ["sre", "platform"],
      seniority: "senior",
      location: "remote",
      mustHaveSkills: ["kubernetes", "terraform"]
    };

    const response = await request(app.getHttpServer())
      .put("/profile")
      .set("x-tenant-id", tenant.id)
      .send(updatedData)
      .expect(200);

    expect(response.body.desiredRoles).toEqual(["sre", "platform"]);
    expect(response.body.seniority).toBe("senior");
    expect(response.body.location).toBe("remote");
    expect(response.body.mustHaveSkills).toEqual(["kubernetes", "terraform"]);
  });

  it("validates profile data", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "ValidateProfile" } });

    // Missing required fields
    await request(app.getHttpServer())
      .put("/profile")
      .set("x-tenant-id", tenant.id)
      .send({})
      .expect(400);

    // Invalid seniority
    await request(app.getHttpServer())
      .put("/profile")
      .set("x-tenant-id", tenant.id)
      .send({
        desiredRoles: ["backend"],
        seniority: "expert", // invalid
        location: "remote",
        mustHaveSkills: ["go"]
      })
      .expect(400);

    // Empty arrays
    await request(app.getHttpServer())
      .put("/profile")
      .set("x-tenant-id", tenant.id)
      .send({
        desiredRoles: [],
        seniority: "mid",
        location: "remote",
        mustHaveSkills: ["go"]
      })
      .expect(400);
  });
});
