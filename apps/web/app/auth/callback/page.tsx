"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

function getStateFromParams(searchParams: ReturnType<typeof useSearchParams>):
  | { status: "success" }
  | { status: "error"; error: string } {
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return { status: "error", error: decodeURIComponent(errorParam) };
  }
  if (!token) {
    return { status: "error", error: "No token received from authentication" };
  }
  return { status: "success" };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken } = useAuth();
  const state = getStateFromParams(searchParams);
  const redirectScheduled = useRef(false);

  useEffect(() => {
    if (state.status !== "success" || redirectScheduled.current) return;
    redirectScheduled.current = true;

    const token = searchParams.get("token");
    if (token) setToken(token);

    const timeout = setTimeout(() => {
      router.push("/");
    }, 1500);

    return () => clearTimeout(timeout);
  }, [state.status, searchParams, setToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {state.status === "success" && (
          <>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              Successfully signed in!
            </h1>
            <p className="text-slate-600 mt-2">Redirecting you to the app...</p>
          </>
        )}

        {state.status === "error" && (
          <>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              Sign in failed
            </h1>
            <p className="text-slate-600 mt-2">{state.error}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              Return to home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
