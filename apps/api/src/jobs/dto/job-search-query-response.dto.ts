import { JobSearchProvider } from "./job-search-query.dto";

export class JobSearchQueryResponseDto {
  id!: string;
  tenantId!: string;
  provider!: JobSearchProvider;
  query!: string;
  location!: string | null;
  seniority!: string | null;
  keywords!: string[];
  cadenceSeconds!: number;
  enabled!: boolean;
  lastRunAt!: string | null;
  createdAt!: string;
  updatedAt!: string;
}
