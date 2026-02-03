import { Injectable } from "@nestjs/common";
import { prisma } from "@cv/db";
import { ApprovalStatus, JobListQueryDto, JobListResponseDto } from "./jobs.dto";

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
}
