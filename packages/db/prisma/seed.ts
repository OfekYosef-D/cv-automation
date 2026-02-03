import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create or get tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "t1" },
    update: {},
    create: {
      id: "t1",
      name: "Demo Tenant"
    }
  });

  console.log("Created tenant:", tenant.id);

  // Create a job source
  const jobSource = await prisma.jobSource.upsert({
    where: { id: "source-1" },
    update: {},
    create: {
      id: "source-1",
      tenantId: tenant.id,
      type: "manual",
      name: "Demo Jobs",
      config: {}
    }
  });

  console.log("Created job source:", jobSource.id);

  // Create a CV and CV version for artefacts
  const cv = await prisma.cv.upsert({
    where: { id: "cv-1" },
    update: {},
    create: {
      id: "cv-1",
      tenantId: tenant.id,
      title: "My CV"
    }
  });

  const cvVersion = await prisma.cvVersion.upsert({
    where: { id: "cv-version-1" },
    update: {},
    create: {
      id: "cv-version-1",
      tenantId: tenant.id,
      cvId: cv.id,
      content: "Full CV content here..."
    }
  });

  console.log("Created CV version:", cvVersion.id);

  // Create sample jobs
  const jobs = [
    {
      id: "job-1",
      tenantId: tenant.id,
      jobSourceId: jobSource.id,
      externalId: "ext-1",
      title: "Senior Fullstack Developer",
      description: "We are looking for an experienced fullstack developer to join our team. You will work on building scalable web applications using React, Node.js, and PostgreSQL.",
      location: "Remote",
      url: "https://example.com/jobs/1",
      postedAt: new Date("2026-01-15"),
      seenAt: new Date(),
      contentHash: "hash-1"
    },
    {
      id: "job-2",
      tenantId: tenant.id,
      jobSourceId: jobSource.id,
      externalId: "ext-2",
      title: "Backend Engineer",
      description: "Join our backend team to build high-performance APIs and microservices. Experience with NestJS, TypeScript, and cloud infrastructure required.",
      location: "New York, NY",
      url: "https://example.com/jobs/2",
      postedAt: new Date("2026-01-20"),
      seenAt: new Date(Date.now() - 86400000),
      contentHash: "hash-2"
    },
    {
      id: "job-3",
      tenantId: tenant.id,
      jobSourceId: jobSource.id,
      externalId: "ext-3",
      title: "Frontend Developer",
      description: "Create beautiful and responsive user interfaces using Next.js, Tailwind CSS, and modern React patterns. Strong UX sensibility preferred.",
      location: "San Francisco, CA",
      url: "https://example.com/jobs/3",
      postedAt: new Date("2026-01-25"),
      seenAt: new Date(Date.now() - 172800000),
      contentHash: "hash-3"
    }
  ];

  for (const job of jobs) {
    await prisma.job.upsert({
      where: { id: job.id },
      update: {},
      create: job
    });
    console.log("Created job:", job.title);
  }

  // Create sample artefacts (tailored CV summaries)
  const artefacts = [
    {
      id: "art-1",
      tenantId: tenant.id,
      jobId: "job-1",
      cvVersionId: cvVersion.id,
      promptVersion: "v1",
      model: "gpt-4",
      claimsUsed: {},
      status: "DRAFT" as const,
      content: "Experienced fullstack developer with 5+ years building React applications and Node.js backends. Strong background in PostgreSQL and cloud deployments. Previously led development of a SaaS platform serving 10k+ users."
    },
    {
      id: "art-2",
      tenantId: tenant.id,
      jobId: "job-2",
      cvVersionId: cvVersion.id,
      promptVersion: "v1",
      model: "gpt-4",
      claimsUsed: {},
      status: "DRAFT" as const,
      content: "Backend specialist with deep expertise in NestJS and TypeScript. Designed and implemented microservices architecture handling 1M+ requests/day. AWS certified with experience in ECS, Lambda, and RDS."
    },
    {
      id: "art-3",
      tenantId: tenant.id,
      jobId: "job-3",
      cvVersionId: cvVersion.id,
      promptVersion: "v1",
      model: "gpt-4",
      claimsUsed: {},
      status: "DRAFT" as const,
      content: "Frontend engineer passionate about user experience. Built responsive interfaces with Next.js and Tailwind CSS. Strong eye for design with experience collaborating closely with UX teams."
    }
  ];

  for (const artefact of artefacts) {
    await prisma.agentArtefact.upsert({
      where: { id: artefact.id },
      update: {},
      create: artefact
    });
    console.log("Created artefact for job:", artefact.jobId);
  }

  console.log("\n✅ Seed complete! Refresh your browser to see the jobs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
