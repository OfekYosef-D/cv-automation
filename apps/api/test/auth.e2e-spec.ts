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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

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
