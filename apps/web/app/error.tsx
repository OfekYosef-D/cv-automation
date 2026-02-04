"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="container mx-auto max-w-3xl py-8 px-4">
      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Something went wrong
        </h2>
        <p className="text-slate-600 mb-6">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </Card>
    </main>
  );
}
