import { Injectable } from "@nestjs/common";

import { MatchJob, MatchProfile, matchJob } from "@cv/matching";

@Injectable()
export class MatchingService {
  score(profile: MatchProfile, job: MatchJob) {
    return matchJob(profile, job);
  }
}
