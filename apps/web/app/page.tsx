import { Suspense } from "react";
import { ApprovalConsole } from "../components/approval-console";
import { UserMenu } from "../components/user-menu";

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Approval Console</h1>
        <UserMenu />
      </div>
      <Suspense fallback={<LoadingFallback />}>
        <ApprovalConsole />
      </Suspense>
    </main>
  );
}
