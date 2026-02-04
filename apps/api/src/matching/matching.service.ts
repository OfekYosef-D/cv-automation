import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@cv/db";

import { MatchJob, MatchProfile, MatchResult, matchJob } from "@cv/matching";

export interface JobMatchResult extends MatchResult {
  job: {
    id: string;
    title: string;
  };
}

@Injectable()
export class MatchingService {
  score(profile: MatchProfile, job: MatchJob): MatchResult {
    return matchJob(profile, job);
  }

  async getJobMatch(tenantId: string, jobId: string): Promise<JobMatchResult> {
    // Fetch job by ID
    const job = await prisma.job.findFirst({
      where: { id: jobId, tenantId }
    });

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    // Fetch tenant's profile
    const profile = await prisma.userProfile.findUnique({
      where: { tenantId }
    });

    if (!profile) {
      throw new BadRequestException("Profile not configured. Create a profile first via PUT /profile");
    }

    // Build MatchProfile from stored profile
    const matchProfile: MatchProfile = {
      desiredRoles: profile.desiredRoles,
      seniority: profile.seniority as "junior" | "mid" | "senior",
      location: profile.location,
      mustHaveSkills: profile.mustHaveSkills
    };

    // Build MatchJob from stored job
    const matchJobData: MatchJob = {
      title: job.title,
      description: job.description,
      location: job.location ?? undefined,
      postedAt: job.postedAt ?? undefined
    };

    // Compute match score
    const result = matchJob(matchProfile, matchJobData);

    return {
      ...result,
      job: {
        id: job.id,
        title: job.title
      }
    };
  }
}
