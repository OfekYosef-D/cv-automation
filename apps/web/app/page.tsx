import { ApprovalConsole } from "../components/approval-console";
import { getJobs } from "../lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export default async function HomePage() {
  let jobsResponse;

  try {
    jobsResponse = await getJobs({ page: 1, pageSize: 20 });
  } catch (error) {
    // Log full error details server-side for debugging
    console.error("Failed to fetch jobs:", error);

    return (
      <main className="p-8 font-sans">
        <h1 className="text-2xl font-bold mb-6">Approval Console</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">
            Failed to load jobs. Please ensure the API is running at{" "}
            <code className="bg-red-100 px-1 rounded">{API_BASE_URL}</code>
          </p>
          <p className="text-red-600 text-sm mt-2">An unexpected error occurred. Please try again later.</p>
        </div>
      </main>
    );
  }

  if (jobsResponse.jobs.length === 0) {
    return (
      <main className="p-8 font-sans">
        <h1 className="text-2xl font-bold mb-6">Approval Console</h1>
        <p className="text-slate-600">No jobs available</p>
      </main>
    );
  }

  return (
    <main className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">Approval Console</h1>
      <ApprovalConsole jobs={jobsResponse.jobs} />
    </main>
  );
}
