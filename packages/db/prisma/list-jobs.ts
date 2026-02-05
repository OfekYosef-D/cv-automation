/**
 * List jobs in the database.
 * Run with: pnpm --filter @cv/db exec tsx prisma/list-jobs.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    select: {
      id: true,
      title: true,
      location: true,
      url: true,
      source: {
        select: { name: true }
      },
      postedAt: true
    },
    orderBy: { seenAt: "desc" },
    take: 30
  });

  console.log("\n=== Jobs in Database ===\n");
  
  if (jobs.length === 0) {
    console.log("No jobs found.");
    return;
  }

  jobs.forEach((job, i) => {
    console.log(`${i + 1}. ${job.title}`);
    console.log(`   Location: ${job.location || "Remote"}`);
    console.log(`   Source: ${job.source.name}`);
    console.log(`   URL: ${job.url}`);
    console.log("");
  });

  const totalCount = await prisma.job.count();
  console.log(`\nShowing ${jobs.length} of ${totalCount} total jobs`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
