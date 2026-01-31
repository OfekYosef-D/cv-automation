import { ingestGreenhouse } from "./greenhouse";

interface RssJobInput {
  externalId: string;
  title: string;
  description: string;
  location?: string;
  url: string;
  postedAt?: Date;
}

interface IngestRssParams {
  tenantId: string;
  jobSourceId: string;
  jobs: RssJobInput[];
}

export async function ingestRss(params: IngestRssParams) {
  await ingestGreenhouse({
    tenantId: params.tenantId,
    jobSourceId: params.jobSourceId,
    jobs: params.jobs
  });
}
