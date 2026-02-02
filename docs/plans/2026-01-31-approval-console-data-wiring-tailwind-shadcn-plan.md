# Approval Console Data Wiring + Tailwind/shadcn Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the Approval Console to real API data and actions with pagination, filtering, and optimistic UX, while establishing Tailwind + shadcn UI foundations.

**Architecture:** Add jobs list/detail endpoints in the Nest API with pagination/sorting and approval-status filters. Build a typed API client for Next.js, render the console from server data, and perform approvals via client actions with optimistic updates and error handling. Style the UI with Tailwind + shadcn base components.

**Tech Stack:** NestJS, Prisma, Next.js App Router, Vitest, Tailwind CSS, shadcn/ui.

---

### Task 1: Add Jobs list endpoint with pagination/sorting/filtering (API)

**Files:**
- Create: apps/api/test/jobs.e2e-spec.ts
- Create: apps/api/src/jobs/jobs.controller.ts
- Create: apps/api/src/jobs/jobs.service.ts
- Create: apps/api/src/jobs/jobs.module.ts
- Create: apps/api/src/jobs/jobs.dto.ts
- Modify: apps/api/src/app.module.ts

**Step 1: Write the failing test**

```ts
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { prisma } from "@cv/db";

import { AppModule } from "../src/app.module";

describe("Jobs (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists jobs with latest artefact and approval status", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "Acme" } });
    const source = await prisma.jobSource.create({
      data: {
        tenantId: tenant.id,
        type: "greenhouse",
        name: "Greenhouse",
        config: { baseUrl: "https://boards.greenhouse.io" }
      }
    });

    const job = await prisma.job.create({
      data: {
        tenantId: tenant.id,
        jobSourceId: source.id,
        externalId: "job-1",
        title: "Fullstack Developer",
        description: "Build web apps",
        location: "Remote",
        url: "https://example.com/job-1",
        contentHash: "hash-1",
        seenAt: new Date("2026-01-31T10:00:00Z")
      }
    });

    const cv = await prisma.cv.create({
      data: { tenantId: tenant.id, title: "Default CV" }
    });

    const cvVersion = await prisma.cvVersion.create({
      data: { tenantId: tenant.id, cvId: cv.id, content: "CV content" }
    });

    await prisma.agentArtefact.create({
      data: {
        tenantId: tenant.id,
        jobId: job.id,
        cvVersionId: cvVersion.id,
        promptVersion: "v1",
        model: "gpt-5.2",
        claimsUsed: [{ claim: "Built APIs" }],
        status: "DRAFT",
        content: "Tailored summary"
      }
    });

    const response = await request(app.getHttpServer())
      .get("/jobs?page=1&pageSize=20&sort=seenAt")
      .set("x-tenant-id", tenant.id)
      .expect(200);

    expect(response.body.jobs).toHaveLength(1);
    expect(response.body.jobs[0].id).toBe(job.id);
    expect(response.body.jobs[0].title).toBe("Fullstack Developer");
    expect(response.body.jobs[0].latestArtefact?.content).toBe("Tailored summary");
    expect(response.body.jobs[0].approvalStatus).toBe("PENDING");
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
  });

  it("filters jobs by approval status", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "Beta" } });
    const source = await prisma.jobSource.create({
      data: {
        tenantId: tenant.id,
        type: "greenhouse",
        name: "Greenhouse",
        config: { baseUrl: "https://boards.greenhouse.io" }
      }
    });

    const job = await prisma.job.create({
      data: {
        tenantId: tenant.id,
        jobSourceId: source.id,
        externalId: "job-2",
        title: "Data Engineer",
        description: "Build pipelines",
        location: "Hybrid",
        url: "https://example.com/job-2",
        contentHash: "hash-2",
        seenAt: new Date("2026-01-31T12:00:00Z")
      }
    });

    await prisma.approval.create({
      data: { tenantId: tenant.id, jobId: job.id, status: "REJECTED" }
    });

    const response = await request(app.getHttpServer())
      .get("/jobs?status=REJECTED")
      .set("x-tenant-id", tenant.id)
      .expect(200);

    expect(response.body.jobs).toHaveLength(1);
    expect(response.body.jobs[0].approvalStatus).toBe("REJECTED");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test:e2e -- jobs`
Expected: FAIL with 404 for `GET /jobs`.

**Step 3: Write minimal implementation**

```ts
// jobs.dto.ts
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SNOOZED";

export interface JobListItemDto {
  id: string;
  title: string;
  location: string | null;
  postedAt: string | null;
  latestArtefact: {
    id: string;
    status: "DRAFT" | "APPROVED" | "REJECTED";
    content: string;
  } | null;
  approvalStatus: ApprovalStatus;
}

export interface JobListResponseDto {
  jobs: JobListItemDto[];
  page: number;
  pageSize: number;
}

export interface JobListQueryDto {
  page?: number;
  pageSize?: number;
  sort?: "seenAt";
  status?: ApprovalStatus;
}
```

```ts
// jobs.service.ts
import { Injectable } from "@nestjs/common";
import { prisma } from "@cv/db";
import { ApprovalStatus, JobListQueryDto, JobListResponseDto } from "./jobs.dto";

@Injectable()
export class JobsService {
  async listJobs(tenantId: string, query: JobListQueryDto): Promise<JobListResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const statusFilter = query.status;

    const jobs = await prisma.job.findMany({
      where: { tenantId },
      orderBy: { seenAt: "desc" },
      include: {
        artefacts: { orderBy: { createdAt: "desc" }, take: 1 },
        approvals: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    const mapped = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      location: job.location,
      postedAt: job.postedAt ? job.postedAt.toISOString() : null,
      latestArtefact: job.artefacts[0]
        ? {
            id: job.artefacts[0].id,
            status: job.artefacts[0].status,
            content: job.artefacts[0].content
          }
        : null,
      approvalStatus: (job.approvals[0]?.status ?? "PENDING") as ApprovalStatus
    }));

    const jobsFiltered = statusFilter
      ? mapped.filter((job) => job.approvalStatus === statusFilter)
      : mapped;

    return { jobs: jobsFiltered, page, pageSize };
  }
}
```

```ts
// jobs.controller.ts
import { Controller, Get, Query, Req } from "@nestjs/common";
import { Request } from "express";

import { JobsService } from "./jobs.service";
import { JobListQueryDto } from "./jobs.dto";

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list(@Req() request: Request, @Query() query: JobListQueryDto) {
    const tenantId = request.tenantId ?? "";
    return this.jobsService.listJobs(tenantId, query);
  }
}
```

```ts
// jobs.module.ts
import { Module } from "@nestjs/common";

import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  controllers: [JobsController],
  providers: [JobsService]
})
export class JobsModule {}
```

```ts
// app.module.ts (snippet)
import { JobsModule } from "./jobs/jobs.module";

@Module({
  controllers: [
    HealthController,
    MeController,
    ArtefactsController,
    MatchingController,
    ApprovalsController,
    JobsController
  ],
  providers: [AuthGuard, ArtefactsService, MatchingService, ApprovalsService, JobsService],
  imports: [JobsModule]
})
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test:e2e -- jobs`
Expected: PASS for list + filter tests.

**Step 5: Commit**

```bash
git add .
git commit -m "feat(api): add jobs list endpoint with paging and filters"
```

---

### Task 2: Add Job detail endpoint with artefacts (API)

**Files:**
- Modify: apps/api/test/jobs.e2e-spec.ts
- Modify: apps/api/src/jobs/jobs.controller.ts
- Modify: apps/api/src/jobs/jobs.service.ts
- Modify: apps/api/src/jobs/jobs.dto.ts

**Step 1: Write the failing test**

```ts
it("fetches job detail with artefacts", async () => {
  const tenant = await prisma.tenant.create({ data: { name: "Gamma" } });
  const source = await prisma.jobSource.create({
    data: {
      tenantId: tenant.id,
      type: "greenhouse",
      name: "Greenhouse",
      config: { baseUrl: "https://boards.greenhouse.io" }
    }
  });

  const job = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      jobSourceId: source.id,
      externalId: "job-3",
      title: "Data Engineer",
      description: "Build pipelines",
      location: "Hybrid",
      url: "https://example.com/job-3",
      contentHash: "hash-3"
    }
  });

  const cv = await prisma.cv.create({
    data: { tenantId: tenant.id, title: "Default CV" }
  });

  const cvVersion = await prisma.cvVersion.create({
    data: { tenantId: tenant.id, cvId: cv.id, content: "CV content" }
  });

  await prisma.agentArtefact.create({
    data: {
      tenantId: tenant.id,
      jobId: job.id,
      cvVersionId: cvVersion.id,
      promptVersion: "v1",
      model: "gpt-5.2",
      claimsUsed: [{ claim: "ETL pipelines" }],
      status: "DRAFT",
      content: "Pipeline summary"
    }
  });

  const response = await request(app.getHttpServer())
    .get(`/jobs/${job.id}`)
    .set("x-tenant-id", tenant.id)
    .expect(200);

  expect(response.body.id).toBe(job.id);
  expect(response.body.artefacts).toHaveLength(1);
  expect(response.body.artefacts[0].content).toBe("Pipeline summary");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test:e2e -- jobs`
Expected: FAIL with 404 for `GET /jobs/:id`.

**Step 3: Write minimal implementation**

```ts
// jobs.dto.ts
export interface JobDetailDto {
  id: string;
  title: string;
  description: string;
  location: string | null;
  postedAt: string | null;
  artefacts: Array<{
    id: string;
    status: "DRAFT" | "APPROVED" | "REJECTED";
    content: string;
  }>;
}
```

```ts
// jobs.service.ts
import { JobDetailDto } from "./jobs.dto";

async getJob(tenantId: string, jobId: string): Promise<JobDetailDto | null> {
  const job = await prisma.job.findFirst({
    where: { id: jobId, tenantId },
    include: { artefacts: { orderBy: { createdAt: "desc" } } }
  });

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    postedAt: job.postedAt ? job.postedAt.toISOString() : null,
    artefacts: job.artefacts.map((artefact) => ({
      id: artefact.id,
      status: artefact.status,
      content: artefact.content
    }))
  };
}
```

```ts
// jobs.controller.ts
import { NotFoundException, Param } from "@nestjs/common";

@Get(":jobId")
async detail(@Req() request: Request, @Param("jobId") jobId: string) {
  const tenantId = request.tenantId ?? "";
  const job = await this.jobsService.getJob(tenantId, jobId);

  if (!job) {
    throw new NotFoundException();
  }

  return job;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test:e2e -- jobs`
Expected: PASS for the job detail test.

**Step 5: Commit**

```bash
git add .
git commit -m "feat(api): add job detail endpoint"
```

---

### Task 3: Add approval reject/snooze endpoints (API)

**Files:**
- Modify: apps/api/test/jobs.e2e-spec.ts
- Modify: apps/api/src/approvals/approvals.controller.ts
- Modify: apps/api/src/approvals/approvals.service.ts

**Step 1: Write the failing test**

```ts
it("supports approve, reject, and snooze", async () => {
  const tenant = await prisma.tenant.create({ data: { name: "Delta" } });
  const source = await prisma.jobSource.create({
    data: {
      tenantId: tenant.id,
      type: "greenhouse",
      name: "Greenhouse",
      config: { baseUrl: "https://boards.greenhouse.io" }
    }
  });

  const job = await prisma.job.create({
    data: {
      tenantId: tenant.id,
      jobSourceId: source.id,
      externalId: "job-4",
      title: "Frontend Engineer",
      description: "Build UI",
      location: "Remote",
      url: "https://example.com/job-4",
      contentHash: "hash-4"
    }
  });

  await request(app.getHttpServer())
    .post("/approvals/reject")
    .set("x-tenant-id", tenant.id)
    .send({ jobId: job.id })
    .expect(201);

  await request(app.getHttpServer())
    .post("/approvals/snooze")
    .set("x-tenant-id", tenant.id)
    .send({ jobId: job.id })
    .expect(201);

  const approvals = await prisma.approval.findMany({
    where: { tenantId: tenant.id, jobId: job.id },
    orderBy: { createdAt: "desc" }
  });

  expect(approvals[0].status).toBe("SNOOZED");
  expect(approvals[1].status).toBe("REJECTED");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test:e2e -- jobs`
Expected: FAIL with 404 for `POST /approvals/reject` and `POST /approvals/snooze`.

**Step 3: Write minimal implementation**

```ts
// approvals.service.ts
async reject(tenantId: string, jobId: string) {
  const approval = await prisma.approval.create({
    data: { tenantId, jobId, status: "REJECTED" }
  });

  await prisma.consentLog.create({
    data: { tenantId, action: "reject", metadata: { jobId } }
  });

  return approval;
}

async snooze(tenantId: string, jobId: string) {
  const approval = await prisma.approval.create({
    data: { tenantId, jobId, status: "SNOOZED" }
  });

  await prisma.consentLog.create({
    data: { tenantId, action: "snooze", metadata: { jobId } }
  });

  return approval;
}
```

```ts
// approvals.controller.ts
@Post("reject")
reject(@Req() request: Request, @Body() body: ApproveBody) {
  const tenantId = request.tenantId ?? "";
  return this.approvalsService.reject(tenantId, body.jobId);
}

@Post("snooze")
snooze(@Req() request: Request, @Body() body: ApproveBody) {
  const tenantId = request.tenantId ?? "";
  return this.approvalsService.snooze(tenantId, body.jobId);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test:e2e -- jobs`
Expected: PASS for approval action tests.

**Step 5: Commit**

```bash
git add .
git commit -m "feat(api): add reject and snooze approval endpoints"
```

---

### Task 4: Wire Approval Console data (API client + page)

**Files:**
- Create: apps/web/lib/api.ts
- Create: apps/web/components/approval-console.tsx
- Modify: apps/web/app/page.tsx
- Modify: apps/web/__tests__/approval-console.test.tsx

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "../app/page";

vi.mock("../lib/api", () => ({
  getJobs: vi.fn(async () => ({
    jobs: [
      {
        id: "job-1",
        title: "Fullstack Developer",
        location: "Remote",
        postedAt: null,
        approvalStatus: "PENDING",
        latestArtefact: { id: "art-1", status: "DRAFT", content: "Tailored summary" }
      }
    ],
    page: 1,
    pageSize: 20
  })),
  getJobDetail: vi.fn(async () => ({
    id: "job-1",
    title: "Fullstack Developer",
    description: "Build web apps",
    location: "Remote",
    postedAt: null,
    artefacts: [{ id: "art-1", status: "DRAFT", content: "Tailored summary" }]
  })),
  approveJob: vi.fn(async () => ({})),
  rejectJob: vi.fn(async () => ({})),
  snoozeJob: vi.fn(async () => ({}))
}));

describe("Approval Console", () => {
  it("renders dynamic job data and action buttons", async () => {
    render(<HomePage />);

    expect(await screen.findByText("Fullstack Developer")).toBeInTheDocument();
    expect(await screen.findByText("Tailored summary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Snooze" })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test -- -t "Approval Console"`
Expected: FAIL with module resolution error for `lib` or missing `ApprovalConsole`.

**Step 3: Write minimal implementation**

```ts
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "t1";

export interface JobListResponse {
  jobs: Array<{
    id: string;
    title: string;
    location: string | null;
    postedAt: string | null;
    approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "SNOOZED";
    latestArtefact: { id: string; status: "DRAFT" | "APPROVED" | "REJECTED"; content: string } | null;
  }>;
  page: number;
  pageSize: number;
}

export interface JobDetailResponse {
  id: string;
  title: string;
  description: string;
  location: string | null;
  postedAt: string | null;
  artefacts: Array<{ id: string; status: "DRAFT" | "APPROVED" | "REJECTED"; content: string }>;
}

async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const getJobs = (params?: { status?: string; page?: number; pageSize?: number }) => {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  search.set("sort", "seenAt");
  return apiFetch(`/jobs?${search.toString()}`) as Promise<JobListResponse>;
};

export const getJobDetail = (jobId: string) => apiFetch(`/jobs/${jobId}`) as Promise<JobDetailResponse>;

export const approveJob = (jobId: string) =>
  apiFetch("/approvals/approve", { method: "POST", body: JSON.stringify({ jobId }) });

export const rejectJob = (jobId: string) =>
  apiFetch("/approvals/reject", { method: "POST", body: JSON.stringify({ jobId }) });

export const snoozeJob = (jobId: string) =>
  apiFetch("/approvals/snooze", { method: "POST", body: JSON.stringify({ jobId }) });
```

```tsx
// components/approval-console.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { approveJob, rejectJob, snoozeJob } from "../lib/api";

interface ApprovalConsoleProps {
  job: {
    id: string;
    title: string;
    location: string | null;
  };
  artefact: { id: string; status: string; content: string } | null;
}

export function ApprovalConsole({ job, artefact }: ApprovalConsoleProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(artefact?.status ?? null);
  const [error, setError] = useState<string | null>(null);

  const actionsDisabled = useMemo(() => isPending, [isPending]);

  return (
    <section>
      <div>
        <h2>Jobs</h2>
        <ul>
          <li>
            <strong>{job.title}</strong>
            <div>{job.location ?? "Unknown"}</div>
          </li>
        </ul>
      </div>
      <div>
        <h2>Artefacts</h2>
        <p>{artefact?.content ?? "No artefact yet"}</p>
        <div>
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() =>
              startTransition(async () => {
                try {
                  setError(null);
                  await approveJob(job.id);
                  setStatus("APPROVED");
                } catch (err) {
                  setError("Approval failed");
                }
              })
            }
          >
            Approve
          </button>
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() =>
              startTransition(async () => {
                try {
                  setError(null);
                  await rejectJob(job.id);
                  setStatus("REJECTED");
                } catch (err) {
                  setError("Rejection failed");
                }
              })
            }
          >
            Reject
          </button>
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() =>
              startTransition(async () => {
                try {
                  setError(null);
                  await snoozeJob(job.id);
                  setStatus("SNOOZED");
                } catch (err) {
                  setError("Snooze failed");
                }
              })
            }
          >
            Snooze
          </button>
          {status ? <div>Current: {status}</div> : null}
          {error ? <div role="alert">{error}</div> : null}
        </div>
      </div>
    </section>
  );
}
```

```tsx
// app/page.tsx
import { ApprovalConsole } from "../components/approval-console";
import { getJobs, getJobDetail } from "../lib/api";

export default async function HomePage() {
  const jobsResponse = await getJobs({ page: 1, pageSize: 20 });
  const firstJob = jobsResponse.jobs[0];

  if (!firstJob) {
    return (
      <main>
        <h1>Approval Console</h1>
        <p>No jobs available</p>
      </main>
    );
  }

  const jobDetail = await getJobDetail(firstJob.id);
  const firstArtefact = jobDetail.artefacts[0] ?? null;

  return (
    <main>
      <h1>Approval Console</h1>
      <ApprovalConsole job={firstJob} artefact={firstArtefact} />
    </main>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/web test -- -t "Approval Console"`
Expected: PASS for dynamic data wiring.

**Step 5: Commit**

```bash
git add .
git commit -m "feat(web): wire approval console data and actions"
```

---

### Task 5: Tailwind + shadcn setup and styling

**Files:**
- Create: apps/web/tailwind.config.ts
- Create: apps/web/postcss.config.js
- Create: apps/web/components.json
- Create: apps/web/app/globals.css
- Create: apps/web/components/ui/button.tsx
- Create: apps/web/components/ui/card.tsx
- Create: apps/web/components/ui/badge.tsx
- Modify: apps/web/app/layout.tsx
- Modify: apps/web/components/approval-console.tsx
- Modify: apps/web/package.json

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApprovalConsole } from "../components/approval-console";

describe("Approval Console styling", () => {
  it("renders action buttons with Tailwind classes", () => {
    render(
      <ApprovalConsole
        job={{ id: "job-1", title: "Fullstack Developer", location: "Remote" }}
        artefact={{ id: "art-1", status: "DRAFT", content: "Tailored summary" }}
      />
    );

    const approveButton = screen.getByRole("button", { name: "Approve" });
    expect(approveButton.className).toContain("inline-flex");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test -- -t "Approval Console styling"`
Expected: FAIL because `ApprovalConsole` does not yet use shadcn `Button` classes.

**Step 3: Write minimal implementation**

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {}
  },
  plugins: []
};

export default config;
```

```js
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

```json
// components.json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "apps/web/tailwind.config.ts",
    "css": "apps/web/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "apps/web/components",
    "utils": "apps/web/lib"
  }
}
```

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

body {
  @apply bg-white text-slate-900;
}
```

```tsx
// components/ui/button.tsx
import * as React from "react";
import { clsx } from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-slate-900 text-white hover:bg-slate-800",
        variant === "outline" && "border border-slate-300 bg-white hover:bg-slate-50",
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
```

```tsx
// components/ui/card.tsx
import * as React from "react";
import { clsx } from "clsx";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("rounded-lg border border-slate-200 bg-white shadow-sm", className)} {...props} />
  )
);

Card.displayName = "Card";
```

```tsx
// components/ui/badge.tsx
import * as React from "react";
import { clsx } from "clsx";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700",
        className
      )}
      {...props}
    />
  );
}
```

```tsx
// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Approval Console",
  description: "CV Automation approval workflow"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
```

```tsx
// components/approval-console.tsx (update to shadcn)
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

// ...inside render
<Card className="p-6">
  <h2 className="text-lg font-semibold">Jobs</h2>
  <div className="mt-4">
    <div className="font-medium">{job.title}</div>
    <div className="text-sm text-slate-600">{job.location ?? "Unknown"}</div>
  </div>
</Card>

// ...actions
<div className="mt-4 flex gap-3">
  <Button type="button" disabled={actionsDisabled} onClick={...}>Approve</Button>
  <Button type="button" variant="outline" disabled={actionsDisabled} onClick={...}>Reject</Button>
  <Button type="button" variant="outline" disabled={actionsDisabled} onClick={...}>Snooze</Button>
</div>
{status ? <Badge className="mt-3">Current: {status}</Badge> : null}
{error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
```

```json
// package.json (devDependencies additions)
{
  "devDependencies": {
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.15",
    "clsx": "^2.1.1"
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/web test -- -t "Approval Console styling"`
Expected: PASS with Tailwind classes present.

**Step 5: Commit**

```bash
git add .
git commit -m "feat(web): add tailwind and shadcn base components"
```

---

### Task 6: Add approval console UX tests for optimistic updates

**Files:**
- Modify: apps/web/__tests__/approval-console.test.tsx

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApprovalConsole } from "../components/approval-console";

vi.mock("../lib/api", () => ({
  approveJob: vi.fn(async () => ({})),
  rejectJob: vi.fn(async () => ({})),
  snoozeJob: vi.fn(async () => ({}))
}));

describe("Approval Console actions", () => {
  it("updates status optimistically after approve", async () => {
    render(
      <ApprovalConsole
        job={{ id: "job-1", title: "Fullstack Developer", location: "Remote" }}
        artefact={{ id: "art-1", status: "DRAFT", content: "Tailored summary" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Current: APPROVED")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test -- -t "Approval Console actions"`
Expected: FAIL if optimistic update not wired.

**Step 3: Write minimal implementation**

- Use existing optimistic update logic in `ApprovalConsole` and ensure it renders `Current: APPROVED` on success.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/web test -- -t "Approval Console actions"`
Expected: PASS.

**Step 5: Commit**

```bash
git add .
git commit -m "test(web): cover approval console optimistic updates"
```

---

Plan complete and saved. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
