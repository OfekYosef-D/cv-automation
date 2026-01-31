import { Body, Controller, Post } from "@nestjs/common";

import { MatchJob, MatchProfile } from "@cv/matching";
import { MatchingService } from "./matching.service";

interface MatchRequestBody {
  profile: MatchProfile;
  job: {
    title: string;
    description: string;
    location?: string;
    postedAt?: string;
  };
}

@Controller("matching")
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post("score")
  score(@Body() body: MatchRequestBody) {
    const job: MatchJob = {
      title: body.job.title,
      description: body.job.description,
      location: body.job.location,
      postedAt: body.job.postedAt ? new Date(body.job.postedAt) : undefined
    };

    return this.matchingService.score(body.profile, job);
  }
}
