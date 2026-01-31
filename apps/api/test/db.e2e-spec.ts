import { prisma } from "@cv/db";

describe("Database (e2e)", () => {
  it("creates and fetches a tenant", async () => {
    const created = await prisma.tenant.create({
      data: {
        name: "Acme"
      }
    });

    const found = await prisma.tenant.findUnique({
      where: { id: created.id }
    });

    expect(found?.name).toBe("Acme");
  });
});
