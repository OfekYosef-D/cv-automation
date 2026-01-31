export interface MatchProfile {
  desiredRoles: string[];
  seniority: "junior" | "mid" | "senior";
  location: string;
  mustHaveSkills: string[];
}

export interface MatchJob {
  title: string;
  description: string;
  location?: string;
  postedAt?: Date;
}

export interface MatchResult {
  score: number;
  explanations: string[];
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value.toLowerCase()));
}

export function matchJob(profile: MatchProfile, job: MatchJob): MatchResult {
  const explanations: string[] = [];
  let score = 0;

  const title = job.title.toLowerCase();
  const description = job.description.toLowerCase();
  const location = (job.location ?? "").toLowerCase();
  const desiredRoles = profile.desiredRoles.map((role) => role.toLowerCase());
  const seniority = profile.seniority.toLowerCase();
  const desiredLocation = profile.location.toLowerCase();
  const skills = profile.mustHaveSkills.map((skill) => skill.toLowerCase());

  if (includesAny(title, desiredRoles)) {
    score += 30;
    explanations.push("role match");
  }

  if (title.includes(seniority)) {
    score += 20;
    explanations.push("seniority match");
  }

  if (
    desiredLocation === "remote" && location.includes("remote") ||
    (desiredLocation && location.includes(desiredLocation))
  ) {
    score += 20;
    explanations.push("location match");
  }

  if (includesAny(description, skills)) {
    score += 20;
    explanations.push("skills match");
  }

  if (job.postedAt) {
    const daysOld =
      (Date.now() - job.postedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld <= 7) {
      score += 10;
      explanations.push("recency match");
    }
  }

  return { score, explanations };
}
