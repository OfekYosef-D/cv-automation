import { prisma } from "@cv/db";
import { JobAlertsService } from "./job-alerts.service";

jest.mock("@cv/db", () => ({
  prisma: {
    jobAlertPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn()
    },
    user: {
      findFirst: jest.fn()
    },
    jobAlert: {
      findMany: jest.fn()
    }
  }
}));

describe("JobAlertsService", () => {
  const service = new JobAlertsService();
  const mockedPrisma = prisma as unknown as {
    jobAlertPreference: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
    jobAlert: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("falls back to the tenant user email when no preference exists", async () => {
    mockedPrisma.jobAlertPreference.findUnique.mockResolvedValue(null);
    mockedPrisma.user.findFirst.mockResolvedValue({
      email: "owner@example.com"
    });

    await expect(service.getPreference("tenant-1")).resolves.toEqual({
      emailEnabled: true,
      emailAddress: "owner@example.com",
      immediateAlerts: true,
      minMatchScore: null,
      cooldownSeconds: 0
    });
  });

  it("upserts tenant preferences", async () => {
    mockedPrisma.jobAlertPreference.upsert.mockResolvedValue({
      emailEnabled: false,
      emailAddress: "alerts@example.com",
      immediateAlerts: false,
      minMatchScore: 70,
      cooldownSeconds: 120
    });

    await service.updatePreference("tenant-1", {
      emailEnabled: false,
      emailAddress: "alerts@example.com",
      immediateAlerts: false,
      minMatchScore: 70,
      cooldownSeconds: 120
    });

    expect(mockedPrisma.jobAlertPreference.upsert).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      create: {
        tenantId: "tenant-1",
        emailEnabled: false,
        emailAddress: "alerts@example.com",
        immediateAlerts: false,
        minMatchScore: 70,
        cooldownSeconds: 120
      },
      update: {
        emailEnabled: false,
        emailAddress: "alerts@example.com",
        immediateAlerts: false,
        minMatchScore: 70,
        cooldownSeconds: 120
      }
    });
  });
});
