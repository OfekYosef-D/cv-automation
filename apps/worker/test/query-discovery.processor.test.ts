import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Job } from "bullmq";

import type { QueryDiscoveryJobData } from "../src/queue/query-discovery.queue";
import { processQueryDiscoveryJob } from "../src/queue/query-discovery.processor";

const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue(undefined);
  const createTransport = vi.fn(() => ({ sendMail }));
  return { createTransport, sendMail };
});

vi.mock("nodemailer", () => ({
  default: { createTransport }
}));

vi.mock("@cv/db", () => ({
  prisma: {
    jobSearchQuery: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    userProfile: {
      findUnique: vi.fn()
    },
    jobAlertPreference: {
      findUnique: vi.fn()
    },
    user: {
      findFirst: vi.fn()
    },
    jobAlert: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    jobSource: {
      upsert: vi.fn()
    },
    job: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    }
  }
}));

vi.mock("../../../packages/shared/src/job-discovery", () => ({
  executeDiscoverySearch: vi.fn(),
  persistDiscoveryJobs: vi.fn(),
  buildAlertDedupeKey: vi.fn(() => "dedupe-key")
}));

import { prisma } from "@cv/db";
import * as shared from "../../../packages/shared/src/job-discovery";

function createJob(data: QueryDiscoveryJobData) {
  return { data, id: "job-1" } as unknown as Job<QueryDiscoveryJobData>;
}

describe("processQueryDiscoveryJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "smtp-user";
    process.env.SMTP_PASS = "smtp-pass";
    process.env.ALERT_FROM_EMAIL = "alerts@example.com";
  });

  it("returns a no-op result when the query is missing", async () => {
    vi.mocked(prisma.jobSearchQuery.findFirst).mockResolvedValue(null as never);

    await expect(
      processQueryDiscoveryJob(
        createJob({
          tenantId: "tenant-1",
          queryId: "query-1"
        })
      )
    ).resolves.toMatchObject({
      fetchedCount: 0,
      savedCount: 0,
      alertCount: 0
    });
  });

  it("updates stats and alert counts for enabled queries", async () => {
    vi.mocked(prisma.jobSearchQuery.findFirst).mockResolvedValue({
      id: "query-1",
      tenantId: "tenant-1",
      provider: "serpapi",
      query: "software engineer",
      sourceOrigin: "linkedin",
      location: "Israel",
      seniority: "junior",
      includeKeywords: ["typescript"],
      excludeKeywords: [],
      relatedTitles: true,
      postedWithinHours: 24,
      maxResultsPerRun: 25,
      minMatchScore: 60,
      cadenceSeconds: 60,
      enabled: true
    } as never);
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue({
      desiredRoles: ["software engineer"],
      seniority: "junior",
      location: "Israel",
      mustHaveSkills: ["TypeScript"]
    } as never);
    vi.mocked(shared.executeDiscoverySearch).mockResolvedValue([
      {
        externalId: "serp-1",
        title: "Junior Software Engineer",
        description: "TypeScript role",
        company: "Acme",
        salary: null,
        tags: ["typescript"],
        location: "Remote",
        url: "https://www.linkedin.com/jobs/view/1/",
        canonicalUrl: "https://www.linkedin.com/jobs/view/1/",
        postedAt: new Date("2026-03-23T10:00:00.000Z"),
        origin: "linkedin",
        sourceLabel: "SerpApi",
        contentHash: "hash-1",
        dedupeKey: "dedupe-key",
        matchScore: 80,
        matchExplanations: ["role match"]
      }
    ] as never);
    vi.mocked(shared.persistDiscoveryJobs).mockResolvedValue([
      {
        job: { id: "job-123", url: "https://www.linkedin.com/jobs/view/1/" },
        isNew: true
      }
    ] as never);
    vi.mocked(prisma.jobAlertPreference.findUnique).mockResolvedValue({
      emailEnabled: true,
      emailAddress: "owner@example.com",
      immediateAlerts: true,
      minMatchScore: 70,
      cooldownSeconds: 0
    } as never);
    vi.mocked(prisma.jobAlert.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.jobAlert.create).mockResolvedValue({
      id: "alert-1",
      status: "PENDING"
    } as never);
    vi.mocked(prisma.jobSearchQuery.update).mockResolvedValue({ id: "query-1" } as never);

    await expect(
      processQueryDiscoveryJob(
        createJob({
          tenantId: "tenant-1",
          queryId: "query-1"
        })
      )
    ).resolves.toMatchObject({
      fetchedCount: 1,
      savedCount: 1,
      alertCount: 1
    });

    expect(prisma.jobSearchQuery.update).toHaveBeenCalledWith({
      where: { id: "query-1" },
      data: expect.objectContaining({
        lastNewJobsCount: 1,
        lastAlertedCount: 1,
        lastError: null
      })
    });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false
      })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        from: "alerts@example.com",
        subject: "New job match: Junior Software Engineer"
      })
    );
  });

  it("keeps alerts pending when SMTP is not configured", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.ALERT_FROM_EMAIL;

    vi.mocked(prisma.jobSearchQuery.findFirst).mockResolvedValue({
      id: "query-1",
      tenantId: "tenant-1",
      provider: "serpapi",
      query: "software engineer",
      sourceOrigin: "linkedin",
      location: "Israel",
      seniority: "junior",
      includeKeywords: ["typescript"],
      excludeKeywords: [],
      relatedTitles: true,
      postedWithinHours: 24,
      maxResultsPerRun: 25,
      minMatchScore: 60,
      cadenceSeconds: 60,
      enabled: true
    } as never);
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue(null as never);
    vi.mocked(shared.executeDiscoverySearch).mockResolvedValue([
      {
        externalId: "serp-1",
        title: "Junior Software Engineer",
        description: "TypeScript role",
        company: "Acme",
        salary: null,
        tags: ["typescript"],
        location: "Remote",
        url: "https://www.linkedin.com/jobs/view/1/",
        canonicalUrl: "https://www.linkedin.com/jobs/view/1/",
        postedAt: new Date("2026-03-23T10:00:00.000Z"),
        origin: "linkedin",
        sourceLabel: "SerpApi",
        contentHash: "hash-1",
        dedupeKey: "dedupe-key",
        matchScore: 80,
        matchExplanations: ["role match"]
      }
    ] as never);
    vi.mocked(shared.persistDiscoveryJobs).mockResolvedValue([
      {
        job: { id: "job-123", url: "https://www.linkedin.com/jobs/view/1/" },
        isNew: true
      }
    ] as never);
    vi.mocked(prisma.jobAlertPreference.findUnique).mockResolvedValue({
      emailEnabled: true,
      emailAddress: "owner@example.com",
      immediateAlerts: true,
      minMatchScore: 70,
      cooldownSeconds: 0
    } as never);
    vi.mocked(prisma.jobAlert.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.jobAlert.create).mockResolvedValue({
      id: "alert-1",
      status: "PENDING"
    } as never);
    vi.mocked(prisma.jobSearchQuery.update).mockResolvedValue({ id: "query-1" } as never);

    await processQueryDiscoveryJob(
      createJob({
        tenantId: "tenant-1",
        queryId: "query-1"
      })
    );

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
