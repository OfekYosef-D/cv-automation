import nodemailer from "nodemailer";
import { Job } from "bullmq";
import { prisma } from "@cv/db";
import {
  buildAlertDedupeKey,
  executeDiscoverySearch,
  persistDiscoveryJobs
} from "../../../../packages/shared/src/job-discovery";
import type { MatchProfile } from "../../../../packages/matching/src/match";
import type { QueryDiscoveryJobData, QueryDiscoveryJobResult } from "./query-discovery.queue";

function timestamp(): string {
  return new Date().toISOString();
}

async function getAlertPreference(tenantId: string) {
  const preference = await prisma.jobAlertPreference.findUnique({
    where: { tenantId }
  });

  if (preference) {
    return preference;
  }

  const user = await prisma.user.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "asc" }
  });

  return {
    emailEnabled: true,
    emailAddress: user?.email ?? null,
    immediateAlerts: true,
    minMatchScore: null,
    cooldownSeconds: 0
  };
}

async function createPendingAlert(input: {
  tenantId: string;
  queryId: string;
  jobId: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; status: "PENDING" | "SENT" | "FAILED" }> {
  const existing = await prisma.jobAlert.findUnique({
    where: {
      tenantId_channel_dedupeKey: {
        tenantId: input.tenantId,
        channel: "EMAIL",
        dedupeKey: input.dedupeKey
      }
    }
  });

  if (existing) {
    await prisma.jobAlert.update({
      where: { id: existing.id },
      data: {
        jobSearchQueryId: input.queryId,
        metadata: input.metadata as never
      }
    });
    return { id: existing.id, status: existing.status as "PENDING" | "SENT" | "FAILED" };
  }

  const alert = await prisma.jobAlert.create({
    data: {
      tenantId: input.tenantId,
      jobId: input.jobId,
      jobSearchQueryId: input.queryId,
      channel: "EMAIL",
      dedupeKey: input.dedupeKey,
      status: "PENDING",
      metadata: input.metadata as never
    }
  });

  return { id: alert.id, status: alert.status as "PENDING" | "SENT" | "FAILED" };
}

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number.parseInt(process.env.SMTP_PORT ?? "", 10);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASS?.trim();
  const from = process.env.ALERT_FROM_EMAIL?.trim();

  if (!host || !Number.isFinite(port) || !user || !password || !from) {
    return null;
  }

  return {
    host,
    port,
    user,
    password,
    from
  };
}

async function deliverAlertEmail(input: {
  to: string;
  from: string;
  jobTitle: string;
  company: string | null;
  url: string;
  query: string;
  matchScore: number | null;
  explanations: string[];
}) {
  const config = smtpConfig();
  if (!config) {
    return false;
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password
    }
  });

  await transport.sendMail({
    from: config.from,
    to: input.to,
    subject: `New job match: ${input.jobTitle}`,
    text: [
      `Query: ${input.query}`,
      `Role: ${input.jobTitle}`,
      input.company ? `Company: ${input.company}` : null,
      input.matchScore !== null ? `Match score: ${input.matchScore}` : null,
      input.explanations.length ? `Why: ${input.explanations.join("; ")}` : null,
      `Link: ${input.url}`
    ]
      .filter(Boolean)
      .join("\n")
  });

  return true;
}

async function loadProfile(tenantId: string): Promise<MatchProfile | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { tenantId }
  });

  if (!profile) {
    return null;
  }

  return {
    desiredRoles: profile.desiredRoles,
    seniority: profile.seniority as MatchProfile["seniority"],
    location: profile.location,
    mustHaveSkills: profile.mustHaveSkills
  };
}

export async function processQueryDiscoveryJob(
  job: Job<QueryDiscoveryJobData>
): Promise<QueryDiscoveryJobResult> {
  const query = await prisma.jobSearchQuery.findFirst({
    where: {
      id: job.data.queryId,
      tenantId: job.data.tenantId,
      enabled: true
    }
  });

  if (!query) {
    return {
      fetchedCount: 0,
      savedCount: 0,
      alertCount: 0,
      completedAt: timestamp()
    };
  }

  try {
    const profile = await loadProfile(job.data.tenantId);
    const results = await executeDiscoverySearch(
      {
        provider: query.provider as "serpapi" | "jsearch",
        query: query.query,
        location: query.location,
        seniority: query.seniority,
        sourceOrigin: (query.sourceOrigin as "all" | "linkedin") ?? "all",
        includeKeywords: query.includeKeywords,
        excludeKeywords: query.excludeKeywords,
        relatedTitles: query.relatedTitles,
        postedWithinHours: query.postedWithinHours,
        maxResultsPerRun: query.maxResultsPerRun,
        minMatchScore: query.minMatchScore,
        useProfile: true
      },
      profile
    );

    const persisted = await persistDiscoveryJobs({
      prisma,
      tenantId: job.data.tenantId,
      provider: query.provider as "serpapi" | "jsearch",
      queryId: query.id,
      jobs: results
    });

    const preference = await getAlertPreference(job.data.tenantId);
    const resultByUrl = new Map(results.map((result) => [result.canonicalUrl, result]));
    let alertCount = 0;

    for (const persistedJob of persisted) {
      if (!persistedJob.isNew) {
        continue;
      }

      const result = resultByUrl.get(persistedJob.job.url);
      if (!result) {
        continue;
      }

      if (
        preference.minMatchScore !== null &&
        result.matchScore !== null &&
        result.matchScore < preference.minMatchScore
      ) {
        continue;
      }

      const alert = await createPendingAlert({
        tenantId: job.data.tenantId,
        queryId: query.id,
        jobId: persistedJob.job.id,
        dedupeKey: buildAlertDedupeKey(result),
        metadata: {
          origin: result.origin ?? "all",
          sourceLabel: result.sourceLabel ?? "unknown",
          matchScore: result.matchScore,
          matchExplanations: result.matchExplanations
        }
      });

      alertCount++;

      if (
        !preference.immediateAlerts ||
        !preference.emailEnabled ||
        !preference.emailAddress ||
        alert.status !== "PENDING"
      ) {
        continue;
      }

      try {
        const delivered = await deliverAlertEmail({
          to: preference.emailAddress,
          from: process.env.ALERT_FROM_EMAIL?.trim() ?? preference.emailAddress,
          jobTitle: result.title,
          company: result.company ?? null,
          url: result.canonicalUrl,
          query: query.query,
          matchScore: result.matchScore,
          explanations: result.matchExplanations
        });

        if (delivered) {
          await prisma.jobAlert.update({
            where: { id: alert.id },
            data: {
              status: "SENT",
              sentAt: new Date(),
              deliveryError: null
            }
          });
        }
      } catch (error) {
        await prisma.jobAlert.update({
          where: { id: alert.id },
          data: {
            status: "FAILED",
            deliveryError: error instanceof Error ? error.message : "Unknown SMTP delivery error"
          }
        });
      }
    }

    await prisma.jobSearchQuery.update({
      where: { id: query.id },
      data: {
        lastRunAt: new Date(),
        lastCompletedAt: new Date(),
        lastNewJobsCount: persisted.filter((entry) => entry.isNew).length,
        lastAlertedCount: alertCount,
        lastError: null
      }
    });

    return {
      fetchedCount: results.length,
      savedCount: persisted.filter((entry) => entry.isNew).length,
      alertCount,
      completedAt: timestamp()
    };
  } catch (error) {
    await prisma.jobSearchQuery.update({
      where: { id: query.id },
      data: {
        lastRunAt: new Date(),
        lastCompletedAt: new Date(),
        lastError: error instanceof Error ? error.message : "Unknown discovery error"
      }
    });

    return {
      fetchedCount: 0,
      savedCount: 0,
      alertCount: 0,
      errors: [error instanceof Error ? error.message : "Unknown discovery error"],
      completedAt: timestamp()
    };
  }
}
