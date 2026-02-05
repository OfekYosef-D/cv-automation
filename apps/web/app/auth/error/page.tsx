"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessage = error
    ? decodeURIComponent(error)
    : "An unknown error occurred during authentication";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Authentication Error
        </h1>

        <p className="text-slate-600 mb-6 break-words">{errorMessage}</p>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            Return to home
          </Link>

          <button
            onClick={() => {
              const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
              window.location.href = `${apiBase}/auth/login`;
            }}
            className="block w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
