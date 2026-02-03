import { Suspense } from "react";
import { ApprovalConsole } from "../components/approval-console";

function LoadingFallback() {
  return (
    <div className="flex gap-8">
      <div className="w-80 h-96 bg-slate-100 rounded-lg animate-pulse" />
      <div className="flex-1 h-96 bg-slate-100 rounded-lg animate-pulse" />
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">Approval Console</h1>
      <Suspense fallback={<LoadingFallback />}>
        <ApprovalConsole />
      </Suspense>
    </main>
  );
}
