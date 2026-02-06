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

  const staleSourceIds = staleSources.map((s) => s.id);

  const [deletedApprovals, deletedArtefacts, deletedMatches, deletedJobs, deletedSources] =
    await prisma.$transaction([
      prisma.approval.deleteMany({
        where: {
          job: {
            jobSourceId: { in: staleSourceIds }
          }
        }
      }),
      prisma.agentArtefact.deleteMany({
        where: {
          job: {
            jobSourceId: { in: staleSourceIds }
          }
        }
      }),
      prisma.jobMatch.deleteMany({
        where: {
          job: {
            jobSourceId: { in: staleSourceIds }
          }
        }
      }),
      prisma.job.deleteMany({
        where: {
          jobSourceId: { in: staleSourceIds }
        }
      }),
      prisma.jobSource.deleteMany({
        where: {
          id: { in: staleSourceIds }
        }
      })
    ]);

  console.log(`\nDeleted ${deletedApprovals.count} approvals from stale sources`);
  console.log(`Deleted ${deletedArtefacts.count} artefacts from stale sources`);
  console.log(`Deleted ${deletedMatches.count} job matches from stale sources`);
  console.log(`Deleted ${deletedJobs.count} jobs from stale sources`);
  console.log(`\n✅ Deleted ${deletedSources.count} stale job sources.`);

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
