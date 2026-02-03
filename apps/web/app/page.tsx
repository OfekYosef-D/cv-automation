import { ApprovalConsole } from "../components/approval-console";
import { getJobs, getJobDetail } from "../lib/api";

export default async function HomePage() {
  const jobsResponse = await getJobs({ page: 1, pageSize: 20 });
  const firstJob = jobsResponse.jobs[0];

  if (!firstJob) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <h1>Approval Console</h1>
        <p>No jobs available</p>
      </main>
    );
  }

  const jobDetail = await getJobDetail(firstJob.id);
  const firstArtefact = jobDetail.artefacts[0] ?? null;

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Approval Console</h1>
      <ApprovalConsole job={firstJob} artefact={firstArtefact} />
    </main>
  );
}
