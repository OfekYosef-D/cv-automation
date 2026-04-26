import { Injectable } from "@nestjs/common";
import { prisma } from "@cv/db";
import { JobAlertStatus, Prisma } from "@prisma/client";
import { JobAlertListItemDto, JobAlertPreferenceResponseDto, UpdateJobAlertPreferenceDto } from "./job-alerts.dto";

function mapPreference(input: {
  emailEnabled: boolean;
  emailAddress: string | null;
  immediateAlerts: boolean;
  minMatchScore: number | null;
  cooldownSeconds: number;
}): JobAlertPreferenceResponseDto {
  return {
    emailEnabled: input.emailEnabled,
    emailAddress: input.emailAddress,
    immediateAlerts: input.immediateAlerts,
    minMatchScore: input.minMatchScore,
    cooldownSeconds: input.cooldownSeconds
  };
}

@Injectable()
export class JobAlertsService {
  async getPreference(tenantId: string): Promise<JobAlertPreferenceResponseDto> {
    const preference = await prisma.jobAlertPreference.findUnique({
      where: { tenantId }
    });

    if (preference) {
      return mapPreference(preference);
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

  async updatePreference(
    tenantId: string,
    dto: UpdateJobAlertPreferenceDto
  ): Promise<JobAlertPreferenceResponseDto> {
    const preference = await prisma.jobAlertPreference.upsert({
      where: { tenantId },
      create: {
        tenantId,
        emailEnabled: dto.emailEnabled,
        emailAddress: dto.emailAddress ?? null,
        immediateAlerts: dto.immediateAlerts,
        minMatchScore: dto.minMatchScore ?? null,
        cooldownSeconds: dto.cooldownSeconds
      },
      update: {
        emailEnabled: dto.emailEnabled,
        emailAddress: dto.emailAddress ?? null,
        immediateAlerts: dto.immediateAlerts,
        minMatchScore: dto.minMatchScore ?? null,
        cooldownSeconds: dto.cooldownSeconds
      }
    });

    return mapPreference(preference);
  }

  async listAlerts(tenantId: string): Promise<JobAlertListItemDto[]> {
    const alerts = await prisma.jobAlert.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        job: true
      }
    });

    return alerts.map((alert) => ({
      id: alert.id,
      channel: alert.channel,
      status: alert.status,
      deliveryError: alert.deliveryError ?? null,
      sentAt: alert.sentAt ? alert.sentAt.toISOString() : null,
      createdAt: alert.createdAt.toISOString(),
      jobSearchQueryId: alert.jobSearchQueryId,
      job: {
        id: alert.job.id,
        title: alert.job.title,
        company: alert.job.company,
        location: alert.job.location,
        url: alert.job.url
      }
    }));
  }

  async createPendingAlert(input: {
    tenantId: string;
    jobId: string;
    jobSearchQueryId: string;
    dedupeKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ created: boolean; id: string }> {
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
          jobSearchQueryId: input.jobSearchQueryId,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined
        }
      });
      return { created: false, id: existing.id };
    }

    const created = await prisma.jobAlert.create({
      data: {
        tenantId: input.tenantId,
        jobId: input.jobId,
        jobSearchQueryId: input.jobSearchQueryId,
        channel: "EMAIL",
        dedupeKey: input.dedupeKey,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined
      }
    });

    return { created: true, id: created.id };
  }

  markSent(alertId: string) {
    return prisma.jobAlert.update({
      where: { id: alertId },
      data: {
        status: JobAlertStatus.SENT,
        sentAt: new Date(),
        deliveryError: null
      }
    });
  }

  markFailed(alertId: string, errorMessage: string) {
    return prisma.jobAlert.update({
      where: { id: alertId },
      data: {
        status: JobAlertStatus.FAILED,
        deliveryError: errorMessage
      }
    });
  }
}
