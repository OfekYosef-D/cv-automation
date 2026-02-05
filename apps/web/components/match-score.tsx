"use client";

import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";

interface MatchScoreProps {
  score: number;
  explanations: string[];
}

interface MatchScoreDisplayProps {
  score: number | null;
  explanations: string[];
  isLoading: boolean;
  error: string | null;
  noProfile?: boolean;
}

/**
 * Get the color class based on score value.
 * green >= 70, yellow >= 40, red < 40
 */
function getScoreColor(score: number): {
  bg: string;
  text: string;
  ring: string;
} {
  if (score >= 70) {
    return {
      bg: "bg-green-100",
      text: "text-green-700",
      ring: "ring-green-500/20"
    };
  }
  if (score >= 40) {
    return {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      ring: "ring-yellow-500/20"
    };
  }
  return {
    bg: "bg-red-100",
    text: "text-red-700",
    ring: "ring-red-500/20"
  };
}

/**
 * Format explanation string to be more readable.
 * e.g., "role match" -> "Role Match"
 */
function formatExplanation(explanation: string): string {
  return explanation
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Core score display component (no loading/error states).
 */
export function MatchScore({ score, explanations }: MatchScoreProps) {
  const colors = getScoreColor(score);

  return (
    <div className="flex items-start gap-4">
      {/* Score Circle */}
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-full ring-2",
          colors.bg,
          colors.text,
          colors.ring
        )}
        aria-label={`Match score: ${score} out of 100`}
      >
        <span className="text-2xl font-bold">{score}</span>
      </div>

      {/* Explanation Badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        {explanations.length > 0 ? (
          explanations.map((explanation) => (
            <Badge
              key={explanation}
              className={cn(
                "border",
                colors.bg,
                colors.text,
                "border-current/20"
              )}
            >
              {formatExplanation(explanation)}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">
            No matching criteria found
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for match score.
 */
export function MatchScoreSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="flex flex-wrap gap-2 pt-1">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Full match score display with loading and error states.
 */
export function MatchScoreDisplay({
  score,
  explanations,
  isLoading,
  error,
  noProfile
}: MatchScoreDisplayProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Match Score
        </h3>
        <MatchScoreSkeleton />
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Match Score
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure your profile to see match scores.{" "}
          <span className="text-slate-600">
            Set your desired roles, skills, and location preferences.
          </span>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Match Score
        </h3>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (score === null) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Match Score
      </h3>
      <MatchScore score={score} explanations={explanations} />
    </div>
  );
}
