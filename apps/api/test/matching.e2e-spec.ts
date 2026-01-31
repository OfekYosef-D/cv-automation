import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";

describe("Matching (e2e)", () => {
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

  it("scores a job", async () => {
    const response = await request(app.getHttpServer())
      .post("/matching/score")
      .set("x-tenant-id", "t1")
      .send({
        profile: {
          desiredRoles: ["fullstack"],
          seniority: "mid",
          location: "remote",
          mustHaveSkills: ["typescript"]
        },
        job: {
          title: "Mid Fullstack Developer",
          description: "TypeScript and Node",
          location: "Remote",
          postedAt: new Date().toISOString()
        }
      })
      .expect(201);

    expect(response.body.score).toBeGreaterThan(0);
    expect(response.body.explanations.length).toBeGreaterThan(0);
  });
});
