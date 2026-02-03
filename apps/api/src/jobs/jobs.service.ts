import { Injectable } from "@nestjs/common";
import { prisma } from "@cv/db";
import { ApprovalStatus, JobDetailDto, JobListQueryDto, JobListResponseDto } from "./jobs.dto";

@Injectable()
export class JobsService {
  async listJobs(tenantId: string, query: JobListQueryDto): Promise<JobListResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const statusFilter = query.status;

    // Fetch all jobs for tenant (status filter requires computing from relation)
    const jobs = await prisma.job.findMany({
      where: { tenantId },
      orderBy: { seenAt: "desc" },
      include: {
        artefacts: { orderBy: { createdAt: "desc" }, take: 1 },
        approvals: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });

    // Map to DTOs with computed approval status
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

    // Filter by status BEFORE pagination
    const filtered = statusFilter
      ? mapped.filter((job) => job.approvalStatus === statusFilter)
      : mapped;

    // Apply pagination to filtered results
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return { jobs: paginated, page, pageSize, total: filtered.length };
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
