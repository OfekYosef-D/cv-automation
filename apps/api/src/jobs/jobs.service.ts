import { Injectable } from "@nestjs/common";
import { prisma } from "@cv/db";
import { ApprovalStatus, JobDetailDto, JobListQueryDto, JobListResponseDto } from "./jobs.dto";

@Injectable()
export class JobsService {
  async listJobs(tenantId: string, query: JobListQueryDto): Promise<JobListResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const statusFilter = query.status;

    const jobs = await prisma.job.findMany({
      where: { tenantId },
      orderBy: { seenAt: "desc" },
      include: {
        artefacts: { orderBy: { createdAt: "desc" }, take: 1 },
        approvals: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    const mapped = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      location: job.location,
      postedAt: job.postedAt ? job.postedAt.toISOString() : null,
      latestArtefact: job.artefacts[0]
        ? {
            id: job.artefacts[0].id,
            status: job.artefacts[0].status,
            content: job.artefacts[0].content
          }
        : null,
      approvalStatus: (job.approvals[0]?.status ?? "PENDING") as ApprovalStatus
    }));

    const jobsFiltered = statusFilter
      ? mapped.filter((job) => job.approvalStatus === statusFilter)
      : mapped;

    return { jobs: jobsFiltered, page, pageSize };
  }

  async getJob(tenantId: string, jobId: string): Promise<JobDetailDto | null> {
    const job = await prisma.job.findFirst({
      where: { id: jobId, tenantId },
      include: { artefacts: { orderBy: { createdAt: "desc" } } }
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location,
      postedAt: job.postedAt ? job.postedAt.toISOString() : null,
      artefacts: job.artefacts.map((artefact) => ({
        id: artefact.id,
        status: artefact.status,
        content: artefact.content
      }))
    };
  }
}
