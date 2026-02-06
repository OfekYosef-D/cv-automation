import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MatchScore, MatchScoreDisplay, MatchScoreSkeleton } from "../components/match-score";

describe("MatchScore", () => {
  describe("color coding", () => {
    it("displays green color for high scores (>= 70)", () => {
      render(<MatchScore score={75} explanations={["role match"]} />);

      const scoreCircle = screen.getByLabelText("Match score: 75 out of 100");
      expect(scoreCircle).toHaveClass("bg-green-100");
      expect(scoreCircle).toHaveClass("text-green-700");
    });

    it("displays green color for score exactly 70", () => {
      render(<MatchScore score={70} explanations={["role match"]} />);

      const scoreCircle = screen.getByLabelText("Match score: 70 out of 100");
      expect(scoreCircle).toHaveClass("bg-green-100");
    });

    it("displays yellow color for medium scores (>= 40 and < 70)", () => {
      render(<MatchScore score={50} explanations={["role match"]} />);

      const scoreCircle = screen.getByLabelText("Match score: 50 out of 100");
      expect(scoreCircle).toHaveClass("bg-yellow-100");
      expect(scoreCircle).toHaveClass("text-yellow-700");
    });

    it("displays yellow color for score exactly 40", () => {
      render(<MatchScore score={40} explanations={["role match"]} />);

      const scoreCircle = screen.getByLabelText("Match score: 40 out of 100");
      expect(scoreCircle).toHaveClass("bg-yellow-100");
    });

    it("displays red color for low scores (< 40)", () => {
      render(<MatchScore score={25} explanations={["role match"]} />);

      const scoreCircle = screen.getByLabelText("Match score: 25 out of 100");
      expect(scoreCircle).toHaveClass("bg-red-100");
      expect(scoreCircle).toHaveClass("text-red-700");
    });

    it("displays red color for score 0", () => {
      render(<MatchScore score={0} explanations={[]} />);

      const scoreCircle = screen.getByLabelText("Match score: 0 out of 100");
      expect(scoreCircle).toHaveClass("bg-red-100");
    });
  });

  describe("explanations", () => {
    it("displays all explanation badges", () => {
      render(
        <MatchScore
          score={80}
          explanations={["role match", "seniority match", "location match", "skills match"]}
        />
      );

      expect(screen.getByText("Role Match")).toBeInTheDocument();
      expect(screen.getByText("Seniority Match")).toBeInTheDocument();
      expect(screen.getByText("Location Match")).toBeInTheDocument();
      expect(screen.getByText("Skills Match")).toBeInTheDocument();
    });

    it("shows message when no explanations", () => {
      render(<MatchScore score={0} explanations={[]} />);

      expect(screen.getByText("No matching criteria found")).toBeInTheDocument();
    });

    it("formats explanations with title case", () => {
      render(<MatchScore score={50} explanations={["recency match"]} />);

      expect(screen.getByText("Recency Match")).toBeInTheDocument();
    });
  });
});

describe("MatchScoreSkeleton", () => {
  it("renders skeleton elements", () => {
    render(<MatchScoreSkeleton />);

    // Should have skeleton elements with animate-pulse class
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("MatchScoreDisplay", () => {
  it("shows loading state", () => {
    render(
      <MatchScoreDisplay
        score={null}
        explanations={[]}
        isLoading={true}
        error={null}
      />
    );

    expect(screen.getByText("Match Score")).toBeInTheDocument();
    // Should show skeletons
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows no profile message when noProfile is true", () => {
    render(
      <MatchScoreDisplay
        score={null}
        explanations={[]}
        isLoading={false}
        error={null}
        noProfile={true}
      />
    );

    expect(screen.getByText("Match Score")).toBeInTheDocument();
    expect(screen.getByText(/Configure your profile to see match scores/)).toBeInTheDocument();
  });

  it("shows error message when error is present", () => {
    render(
      <MatchScoreDisplay
        score={null}
        explanations={[]}
        isLoading={false}
        error="Failed to load match score"
      />
    );

    expect(screen.getByText("Match Score")).toBeInTheDocument();
    expect(screen.getByText("Failed to load match score")).toBeInTheDocument();
  });

  it("shows score when data is loaded", () => {
    render(
      <MatchScoreDisplay
        score={85}
        explanations={["role match", "seniority match"]}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText("Match Score")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("Role Match")).toBeInTheDocument();
    expect(screen.getByText("Seniority Match")).toBeInTheDocument();
  });

  it("returns null when score is null and not loading/error/noProfile", () => {
    const { container } = render(
      <MatchScoreDisplay
        score={null}
        explanations={[]}
        isLoading={false}
        error={null}
        noProfile={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("prioritizes loading state over other states", () => {
    render(
      <MatchScoreDisplay
        score={85}
        explanations={["role match"]}
        isLoading={true}
        error="Some error"
        noProfile={true}
      />
    );

    // Should show loading skeleton, not the score or error
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("85")).not.toBeInTheDocument();
  });

  it("prioritizes noProfile over error when not loading", () => {
    render(
      <MatchScoreDisplay
        score={null}
        explanations={[]}
        isLoading={false}
        error="Some error"
        noProfile={true}
      />
    );

    expect(screen.getByText(/Configure your profile/)).toBeInTheDocument();
    expect(screen.queryByText("Some error")).not.toBeInTheDocument();
  });
});
