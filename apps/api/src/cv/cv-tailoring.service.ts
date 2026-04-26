import { Injectable } from "@nestjs/common";

interface TailorJobInput {
  title: string;
  description: string;
  company?: string | null;
  location?: string | null;
  salary?: string | null;
  tags?: string[];
}

export interface TailoredCvResult {
  content: string;
  summary: string;
  claimsUsed: Array<{ claim: string; score: number }>;
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "build",
  "for",
  "from",
  "have",
  "into",
  "looking",
  "role",
  "that",
  "the",
  "this",
  "with",
  "will",
  "your"
]);

@Injectable()
export class CvTailoringService {
  tailor(baseCvContent: string, job: TailorJobInput): TailoredCvResult {
    const allLines = baseCvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const headerLines = allLines.slice(0, Math.min(3, allLines.length));
    const candidateClaims = allLines.filter((line) => line.length >= 12);
    const keywords = this.extractKeywords(job);

    const scoredClaims = candidateClaims
      .map((claim) => ({
        claim,
        score: this.scoreClaim(claim, keywords)
      }))
      .sort((left, right) => right.score - left.score || right.claim.length - left.claim.length);

    const topClaims = this.pickClaims(scoredClaims);

    const companySuffix = job.company ? ` at ${job.company}` : "";
    const locationLine = job.location ? `Preferred location alignment: ${job.location}` : null;
    const salaryLine = job.salary ? `Compensation context: ${job.salary}` : null;
    const tagLine = job.tags?.length ? `Relevant keywords: ${job.tags.join(", ")}` : null;
    const highlights = topClaims.map((claim) => `- ${this.stripBullet(claim.claim)}`);

    const summary = `Tailored for ${job.title}${companySuffix}. Focused on the strongest base-CV evidence for this role.`;

    const sections = [
      headerLines.join("\n"),
      "",
      "Target Role",
      `${job.title}${companySuffix}`,
      locationLine,
      salaryLine,
      tagLine,
      "",
      "Tailored Summary",
      summary,
      "",
      "Relevant Highlights",
      ...highlights,
      "",
      "Job Requirements Snapshot",
      job.description.trim(),
      "",
      "Current Base CV",
      baseCvContent.trim()
    ].filter((section): section is string => Boolean(section));

    return {
      content: sections.join("\n"),
      summary,
      claimsUsed: topClaims
    };
  }

  private pickClaims(
    scoredClaims: Array<{ claim: string; score: number }>
  ): Array<{ claim: string; score: number }> {
    const selected = scoredClaims.filter((claim) => claim.score > 0).slice(0, 6);
    if (selected.length > 0) {
      return selected;
    }

    return scoredClaims.slice(0, 4);
  }

  private scoreClaim(claim: string, keywords: string[]): number {
    const normalized = claim.toLowerCase();
    return keywords.reduce((score, keyword) => {
      return score + (normalized.includes(keyword) ? 1 : 0);
    }, 0);
  }

  private extractKeywords(job: TailorJobInput): string[] {
    const sourceText = [
      job.title,
      job.description,
      job.company ?? "",
      job.location ?? "",
      job.salary ?? "",
      ...(job.tags ?? [])
    ].join(" ");

    return Array.from(
      new Set(
        sourceText
          .toLowerCase()
          .replace(/[^a-z0-9+\s-]/g, " ")
          .split(/\s+/)
          .map((token) => token.trim())
          .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
      )
    );
  }

  private stripBullet(line: string): string {
    return line.replace(/^[•*\-]\s*/, "").trim();
  }
}
