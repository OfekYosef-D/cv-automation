/**
 * Cleanup script to remove stale job sources from the database.
 * Run with: pnpm --filter @cv/db exec tsx prisma/cleanup-stale-sources.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Valid source IDs from our seed file
const VALID_SOURCE_IDS = [
  "source-1", // Manual/demo
  "source-wix",
  "source-monday",
  "source-taboola",
  "source-ironsource",
  "source-similarweb",
  "source-fiverr",
  "source-checkmarx",
  "source-cyberark",
  "source-remoteok",
  "source-remotive"
];

async function main() {
  console.log("Cleaning up stale job sources...\n");

  // Find all sources not in our valid list
  const staleSources = await prisma.jobSource.findMany({
    where: {
      id: {
        notIn: VALID_SOURCE_IDS
      }
    },
    select: {
      id: true,
      name: true,
      type: true
    }
  });

  console.log(`Found ${staleSources.length} stale sources to delete:`);
  
  if (staleSources.length === 0) {
    console.log("No stale sources found. Database is clean.");
    return;
  }

  // Show first 10 for reference
  staleSources.slice(0, 10).forEach((s) => {
    console.log(`  - ${s.id}: ${s.name} (${s.type})`);
  });
  if (staleSources.length > 10) {
    console.log(`  ... and ${staleSources.length - 10} more`);
  }

  // First, delete jobs linked to stale sources
  const staleSourceIds = staleSources.map((s) => s.id);
  
  // Delete approvals for jobs from stale sources
  const deletedApprovals = await prisma.approval.deleteMany({
    where: {
      job: {
        jobSourceId: { in: staleSourceIds }
      }
    }
  });
  console.log(`\nDeleted ${deletedApprovals.count} approvals from stale sources`);

  // Delete artefacts for jobs from stale sources
  const deletedArtefacts = await prisma.agentArtefact.deleteMany({
    where: {
      job: {
        jobSourceId: { in: staleSourceIds }
      }
    }
  });
  console.log(`Deleted ${deletedArtefacts.count} artefacts from stale sources`);

  // Delete job matches for jobs from stale sources
  const deletedMatches = await prisma.jobMatch.deleteMany({
    where: {
      job: {
        jobSourceId: { in: staleSourceIds }
      }
    }
  });
  console.log(`Deleted ${deletedMatches.count} job matches from stale sources`);

  // Delete jobs from stale sources
  const deletedJobs = await prisma.job.deleteMany({
    where: {
      jobSourceId: { in: staleSourceIds }
    }
  });
  console.log(`Deleted ${deletedJobs.count} jobs from stale sources`);

  // Delete stale sources
  const result = await prisma.jobSource.deleteMany({
    where: {
      id: {
        notIn: VALID_SOURCE_IDS
      }
    }
  });

  console.log(`\n✅ Deleted ${result.count} stale job sources.`);

  // Verify remaining sources
  const remaining = await prisma.jobSource.findMany({
    select: { id: true, name: true, type: true }
  });
  
  console.log(`\nRemaining sources (${remaining.length}):`);
  remaining.forEach((s) => {
    console.log(`  - ${s.name} (${s.type})`);
  });
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
