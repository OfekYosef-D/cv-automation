"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactElement } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ApiError,
  approveJob,
  connectCvTemplate,
  disconnectGoogleConnection,
  generateCvDraft,
  getCvTemplate,
  getGoogleIntegrationStatus,
  getJobs,
  getProfile,
  createSearchQuery,
  deleteSearchQuery,
  getAlertPreferences,
  getAlerts,
  listSearchQueries,
  previewSearchQuery,
  runSearchQuery,
  rejectJob,
  snoozeJob,
  startGoogleConnection,
  updateAlertPreferences,
  updateSearchQuery,
  syncGeneratedCvDraft,
  updateCvTemplatePlaceholders,
  updateGeneratedCvDraft,
  upsertProfile
} from "@/lib/api";
import type {
  ApprovalStatus,
  ApprovalStatusFilter,
  CvPlaceholder,
  CvPlaceholderBindingType,
  CvPlaceholderSourceKey,
  CvTemplate,
  GeneratedCvDraft,
  GoogleIntegrationStatus,
  JobAlert,
  JobAlertPreference,
  Job,
  JobSearchPreviewJob,
  JobSearchProvider,
  JobSearchQuery,
  JobSearchQueryDraft,
  JobSearchSourceOrigin,
  JobListResponse,
  UpsertProfileRequest,
  UserProfile
} from "@/lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { JobDetailPanel } from "./job-detail-panel";
import { Pagination } from "./pagination";
import { StatusFilter } from "./status-filter";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const AUTO_REFRESH_INTERVAL_MS = 30000;
const CONSOLE_LAYOUT_CLASS = "grid gap-6 lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] lg:items-start";
const LEFT_RAIL_CARD_CLASS =
  "flex flex-col gap-4 p-4 lg:sticky lg:top-8 lg:h-[calc(100dvh-9rem)] lg:overflow-hidden";
const DETAIL_CARD_CLASS = "min-w-0 p-6 lg:h-[calc(100dvh-9rem)] lg:overflow-auto";
const VALID_STATUSES: ApprovalStatusFilter[] = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SNOOZED"
];

const SOURCE_OPTIONS: Record<
  CvPlaceholderBindingType,
  Array<{ value: CvPlaceholderSourceKey; label: string }>
> = {
  JOB_FIELD: [
    { value: "title", label: "Job title" },
    { value: "company", label: "Company" },
    { value: "location", label: "Location" },
    { value: "salary", label: "Salary" }
  ],
  PROFILE_FIELD: [
    { value: "desiredRoles", label: "Desired roles" },
    { value: "seniority", label: "Seniority" },
    { value: "profileLocation", label: "Profile location" },
    { value: "mustHaveSkills", label: "Must-have skills" }
  ],
  GENERATED: [
    { value: "headline", label: "Headline" },
    { value: "summary", label: "Summary" },
    { value: "skillsBlock", label: "Skills block" },
    { value: "experienceBullets", label: "Experience bullets" }
  ],
  CUSTOM: [{ value: "custom", label: "Custom text" }]
};

interface ProfileFormState {
  desiredRoles: string;
  seniority: UpsertProfileRequest["seniority"];
  location: string;
  mustHaveSkills: string;
}

interface SearchQueryFormState {
  provider: JobSearchProvider;
  query: string;
  location: string;
  seniority: string;
  sourceOrigin: JobSearchSourceOrigin;
  includeKeywords: string;
  excludeKeywords: string;
  relatedTitles: boolean;
  postedWithinHours: string;
  maxResultsPerRun: string;
  minMatchScore: string;
  cadenceSeconds: string;
  enabled: boolean;
}

function isValidApprovalStatus(value: string | null): value is ApprovalStatusFilter {
  return value !== null && VALID_STATUSES.includes(value as ApprovalStatusFilter);
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) {
    return "Unknown";
  }

  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatCsv(values: string[]): string {
  return values.join(", ");
}

function toProfileForm(profile: UserProfile | null): ProfileFormState {
  return {
    desiredRoles: profile ? formatCsv(profile.desiredRoles) : "",
    seniority: profile?.seniority ?? "junior",
    location: profile?.location ?? "",
    mustHaveSkills: profile ? formatCsv(profile.mustHaveSkills) : ""
  };
}

function emptyGoogleStatus(): GoogleIntegrationStatus {
  return { connected: false, email: null, expiresAt: null, scopes: [] };
}

function bindingLabel(bindingType: CvPlaceholderBindingType): string {
  switch (bindingType) {
    case "JOB_FIELD":
      return "Job field";
    case "PROFILE_FIELD":
      return "Profile field";
    case "GENERATED":
      return "Generated";
    case "CUSTOM":
      return "Custom";
  }
}

function emptySearchQueryForm(profile: UserProfile | null = null): SearchQueryFormState {
  return {
    provider: "serpapi",
    query: profile?.desiredRoles[0] ?? "",
    location: profile?.location ?? "Israel",
    seniority: profile?.seniority ?? "",
    sourceOrigin: "linkedin",
    includeKeywords: profile ? formatCsv(profile.mustHaveSkills) : "",
    excludeKeywords: "",
    relatedTitles: true,
    postedWithinHours: "",
    maxResultsPerRun: "25",
    minMatchScore: "",
    cadenceSeconds: "60",
    enabled: true
  };
}

function toSearchQueryForm(query: JobSearchQuery | null): SearchQueryFormState {
  if (!query) {
    return emptySearchQueryForm();
  }

  return {
    provider: query.provider,
    query: query.query,
    location: query.location ?? "",
    seniority: query.seniority ?? "",
    sourceOrigin: query.sourceOrigin,
    includeKeywords: query.includeKeywords.join(", "),
    excludeKeywords: query.excludeKeywords.join(", "),
    relatedTitles: query.relatedTitles,
    postedWithinHours: query.postedWithinHours?.toString() ?? "",
    maxResultsPerRun: query.maxResultsPerRun.toString(),
    minMatchScore: query.minMatchScore?.toString() ?? "",
    cadenceSeconds: query.cadenceSeconds.toString(),
    enabled: query.enabled
  };
}

function toSearchQueryDraft(form: SearchQueryFormState): JobSearchQueryDraft {
  return {
    provider: form.provider,
    query: form.query.trim(),
    location: form.location.trim() || undefined,
    seniority: form.seniority.trim() || undefined,
    sourceOrigin: form.sourceOrigin,
    includeKeywords: parseCsv(form.includeKeywords),
    excludeKeywords: parseCsv(form.excludeKeywords),
    relatedTitles: form.relatedTitles,
    postedWithinHours: form.postedWithinHours ? Number(form.postedWithinHours) : undefined,
    maxResultsPerRun: form.maxResultsPerRun ? Number(form.maxResultsPerRun) : undefined,
    minMatchScore: form.minMatchScore ? Number(form.minMatchScore) : undefined,
    cadenceSeconds: form.cadenceSeconds ? Number(form.cadenceSeconds) : undefined,
    enabled: form.enabled
  };
}

function formatRelativeDate(value: string | null): string {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function ApprovalConsole(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedPage = parseInt(searchParams.get("page") ?? "", 10);
  const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
  const statusParam = searchParams.get("status");
  const statusFilter: ApprovalStatusFilter = isValidApprovalStatus(statusParam)
    ? statusParam
    : "ALL";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ApprovalStatus>>({});

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => toProfileForm(null));
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [googleStatus, setGoogleStatus] = useState<GoogleIntegrationStatus>(emptyGoogleStatus());
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleSuccess, setGoogleSuccess] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);

  const [template, setTemplate] = useState<CvTemplate | null>(null);
  const [templatePlaceholders, setTemplatePlaceholders] = useState<CvPlaceholder[]>([]);
  const [templateUrl, setTemplateUrl] = useState("");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [isConnectingTemplate, setIsConnectingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const [searchQueries, setSearchQueries] = useState<JobSearchQuery[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [queryForm, setQueryForm] = useState<SearchQueryFormState>(() => emptySearchQueryForm());
  const [previewJobs, setPreviewJobs] = useState<JobSearchPreviewJob[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [querySuccess, setQuerySuccess] = useState<string | null>(null);
  const [isSavingQuery, setIsSavingQuery] = useState(false);
  const [isDeletingQuery, setIsDeletingQuery] = useState(false);
  const [isPreviewingQuery, setIsPreviewingQuery] = useState(false);
  const [isRunningQuery, setIsRunningQuery] = useState(false);

  const [alertPreferences, setAlertPreferences] = useState<JobAlertPreference | null>(null);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [alertPreferencesError, setAlertPreferencesError] = useState<string | null>(null);
  const [alertPreferencesSuccess, setAlertPreferencesSuccess] = useState<string | null>(null);
  const [isSavingAlertPreferences, setIsSavingAlertPreferences] = useState(false);

  const [draftsByJobId, setDraftsByJobId] = useState<Record<string, GeneratedCvDraft>>({});
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftSuccess, setDraftSuccess] = useState<string | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSyncingDraft, setIsSyncingDraft] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  const requestIdRef = useRef(0);
  const discoveryRequestIdRef = useRef(0);
  const isCreatingSearchRef = useRef(false);

  const fetchJobsData = useCallback(async (): Promise<void> => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setFetchError(null);
    try {
      const params: Parameters<typeof getJobs>[0] = { page, pageSize: PAGE_SIZE };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const response: JobListResponse = await getJobs(params);
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      setJobs(response.jobs);
      setTotal(response.total);
      setSelectedJobId((current) => {
        if (response.jobs.length === 0) {
          return null;
        }
        return response.jobs.some((job) => job.id === current) ? current : response.jobs[0].id;
      });
    } catch {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      setFetchError("Failed to load jobs");
      setJobs([]);
      setTotal(0);
      setSelectedJobId(null);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, statusFilter]);

  const fetchDiscoveryData = useCallback(async (): Promise<void> => {
    const currentRequestId = ++discoveryRequestIdRef.current;

    try {
      const [queries, preference, recentAlerts] = await Promise.all([
        listSearchQueries(),
        getAlertPreferences(),
        getAlerts()
      ]);

      if (currentRequestId !== discoveryRequestIdRef.current) {
        return;
      }

      setSearchQueries(queries);
      setAlertPreferences(preference);
      setAlerts(recentAlerts);
      setQueryError(null);
      setAlertPreferencesError(null);
      setSelectedQueryId((current) => {
        if (current && queries.some((query) => query.id === current)) {
          return current;
        }
        return queries[0]?.id ?? null;
      });
    } catch {
      if (currentRequestId !== discoveryRequestIdRef.current) {
        return;
      }

      setQueryError("Failed to load saved searches");
      setAlertPreferencesError("Failed to load alert preferences");
      setSearchQueries([]);
      setAlerts([]);
      setAlertPreferences(null);
    }
  }, []);

  const fetchProfileData = useCallback(async (): Promise<void> => {
    try {
      const response = await getProfile();
      setProfile(response);
      setProfileForm(toProfileForm(response));
      setQueryForm((current) =>
        current.query
          ? current
          : {
              ...emptySearchQueryForm(response),
              maxResultsPerRun: current.maxResultsPerRun,
              minMatchScore: current.minMatchScore,
              postedWithinHours: current.postedWithinHours,
              cadenceSeconds: current.cadenceSeconds,
              enabled: current.enabled,
              excludeKeywords: current.excludeKeywords
            }
      );
      setProfileError(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setProfile(null);
        setProfileForm(toProfileForm(null));
        return;
      }
      setProfileError("Failed to load profile");
    }
  }, []);

  const fetchGoogleStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await getGoogleIntegrationStatus();
      setGoogleStatus(response);
      setGoogleError(null);
    } catch {
      setGoogleStatus(emptyGoogleStatus());
      setGoogleError("Failed to load Google connection status");
    }
  }, []);

  const fetchTemplate = useCallback(async (): Promise<void> => {
    try {
      const response = await getCvTemplate();
      setTemplate(response);
      setTemplatePlaceholders(response.placeholders);
      setTemplateUrl(response.documentUrl ?? "");
      setTemplateError(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setTemplate(null);
        setTemplatePlaceholders([]);
        return;
      }
      setTemplateError("Failed to load CV template");
    }
  }, []);

  useEffect(() => {
    void fetchJobsData();
    return () => {
      requestIdRef.current++;
    };
  }, [fetchJobsData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchJobsData();
      void fetchDiscoveryData();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchDiscoveryData, fetchJobsData]);

  useEffect(() => {
    void fetchProfileData();
    void fetchGoogleStatus();
    void fetchTemplate();
    void fetchDiscoveryData();
  }, [fetchProfileData, fetchGoogleStatus, fetchTemplate, fetchDiscoveryData]);

  useEffect(() => {
    const googleState = searchParams.get("google");
    const googleReason = searchParams.get("google_reason");
    if (googleState === "connected") {
      setGoogleSuccess("Google Workspace connected.");
      setGoogleError(null);
      void fetchGoogleStatus();
    }
    if (googleState === "error") {
      setGoogleSuccess(null);
      setGoogleError(
        googleReason ? `Google connection failed: ${googleReason}` : "Google connection failed"
      );
    }
  }, [fetchGoogleStatus, searchParams]);

  const updateParams = useCallback(
    (updates: Record<string, string | number>): void => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === "ALL" || (key === "page" && value === 1)) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      const queryString = params.toString();
      router.push(queryString ? `?${queryString}` : "/");
    },
    [router, searchParams]
  );

  const handlePageChange = (newPage: number): void => {
    updateParams({ page: newPage });
  };

  const handleStatusChange = (newStatus: ApprovalStatusFilter): void => {
    updateParams({ status: newStatus, page: 1 });
  };

  const handleProfileSave = async (): Promise<void> => {
    const payload: UpsertProfileRequest = {
      desiredRoles: parseCsv(profileForm.desiredRoles),
      seniority: profileForm.seniority,
      location: profileForm.location.trim(),
      mustHaveSkills: parseCsv(profileForm.mustHaveSkills)
    };
    if (payload.desiredRoles.length === 0 || !payload.location) {
      setProfileSuccess(null);
      setProfileError("Add at least one desired role and a location.");
      return;
    }
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const savedProfile = await upsertProfile(payload);
      setProfile(savedProfile);
      setProfileForm(toProfileForm(savedProfile));
      setQueryForm((current) =>
        current.query
          ? current
          : {
              ...emptySearchQueryForm(savedProfile),
              maxResultsPerRun: current.maxResultsPerRun,
              minMatchScore: current.minMatchScore,
              postedWithinHours: current.postedWithinHours,
              cadenceSeconds: current.cadenceSeconds,
              enabled: current.enabled,
              excludeKeywords: current.excludeKeywords
            }
      );
      setProfileSuccess("Profile saved. Match scores and saved searches are now enabled.");
    } catch {
      setProfileError("Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleStartGoogleConnection = async (): Promise<void> => {
    setIsConnectingGoogle(true);
    setGoogleError(null);
    setGoogleSuccess(null);
    try {
      const response = await startGoogleConnection();
      window.open(response.url, "_self");
    } catch {
      setGoogleError("Failed to start the Google connection flow");
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async (): Promise<void> => {
    setIsDisconnectingGoogle(true);
    setGoogleError(null);
    setGoogleSuccess(null);
    try {
      const response = await disconnectGoogleConnection();
      setGoogleStatus(response);
      setTemplate(null);
      setTemplatePlaceholders([]);
      setTemplateSuccess(null);
      setTemplateError(null);
      setGoogleSuccess("Google Workspace disconnected.");
    } catch {
      setGoogleError("Failed to disconnect Google Workspace");
    } finally {
      setIsDisconnectingGoogle(false);
    }
  };

  const handleConnectTemplate = async (): Promise<void> => {
    const documentUrl = templateUrl.trim();
    if (!documentUrl) {
      setTemplateSuccess(null);
      setTemplateError("Enter a Google Docs URL");
      return;
    }
    if (!googleStatus.connected) {
      setTemplateSuccess(null);
      setTemplateError("Connect Google Workspace before attaching a template.");
      return;
    }
    setIsConnectingTemplate(true);
    setTemplateError(null);
    setTemplateSuccess(null);
    try {
      const response = await connectCvTemplate({ documentUrl });
      setTemplate(response);
      setTemplatePlaceholders(response.placeholders);
      setTemplateUrl(response.documentUrl ?? documentUrl);
      setTemplateSuccess("Template connected. Review the detected placeholders below.");
    } catch {
      setTemplateError("Failed to connect the template doc");
    } finally {
      setIsConnectingTemplate(false);
    }
  };

  const handleBindingTypeChange = (
    token: string,
    bindingType: CvPlaceholderBindingType
  ): void => {
    setTemplatePlaceholders((current) =>
      current.map((placeholder) => {
        if (placeholder.token !== token) {
          return placeholder;
        }
        const allowedSources = SOURCE_OPTIONS[bindingType];
        const sourceKey = allowedSources.some((option) => option.value === placeholder.sourceKey)
          ? placeholder.sourceKey
          : allowedSources[0].value;
        return { ...placeholder, bindingType, sourceKey };
      })
    );
  };

  const handleSourceKeyChange = (token: string, sourceKey: CvPlaceholderSourceKey): void => {
    setTemplatePlaceholders((current) =>
      current.map((placeholder) =>
        placeholder.token === token ? { ...placeholder, sourceKey } : placeholder
      )
    );
  };

  const handleInstructionsChange = (token: string, instructions: string): void => {
    setTemplatePlaceholders((current) =>
      current.map((placeholder) =>
        placeholder.token === token
          ? { ...placeholder, instructions: instructions.trim() || null }
          : placeholder
      )
    );
  };

  const handleSavePlaceholderMapping = async (): Promise<void> => {
    if (!template) {
      return;
    }
    setIsSavingTemplate(true);
    setTemplateError(null);
    setTemplateSuccess(null);
    try {
      const response = await updateCvTemplatePlaceholders({
        placeholders: templatePlaceholders
      });
      setTemplate(response);
      setTemplatePlaceholders(response.placeholders);
      setTemplateSuccess("Placeholder mapping saved.");
    } catch {
      setTemplateError("Failed to save placeholder mapping");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const selectQuery = useCallback((query: JobSearchQuery | null): void => {
    isCreatingSearchRef.current = false;
    setSelectedQueryId(query?.id ?? null);
    setQueryForm(toSearchQueryForm(query));
    setPreviewJobs([]);
    setQueryError(null);
    setQuerySuccess(null);
  }, []);

  useEffect(() => {
    if (!selectedQueryId && searchQueries.length > 0 && !isCreatingSearchRef.current) {
      selectQuery(searchQueries[0]);
      return;
    }

    const selectedQuery = searchQueries.find((query) => query.id === selectedQueryId) ?? null;
    if (selectedQuery) {
      setQueryForm(toSearchQueryForm(selectedQuery));
    }
  }, [searchQueries, selectedQueryId, selectQuery]);

  const handleNewSearch = (): void => {
    isCreatingSearchRef.current = true;
    setSelectedQueryId(null);
    setQueryForm(emptySearchQueryForm(profile));
    setPreviewJobs([]);
    setQueryError(null);
    setQuerySuccess(null);
  };

  const refreshDiscovery = useCallback(async (): Promise<void> => {
    await fetchDiscoveryData();
  }, [fetchDiscoveryData]);

  const handleSaveSearch = async (): Promise<void> => {
    const payload = toSearchQueryDraft(queryForm);
    if (!payload.query) {
      setQueryError("Enter a search query before saving.");
      return;
    }
    if (payload.sourceOrigin === "linkedin" && payload.provider !== "serpapi") {
      setQueryError("LinkedIn searches must use the SerpApi provider.");
      return;
    }

    setIsSavingQuery(true);
    setQueryError(null);
    setQuerySuccess(null);
    try {
      if (selectedQueryId) {
        await updateSearchQuery(selectedQueryId, payload);
        setQuerySuccess("Saved search updated.");
      } else {
        const created = await createSearchQuery(payload);
        selectQuery(created);
        setQuerySuccess("Saved search created.");
      }
      await refreshDiscovery();
    } catch {
      setQueryError("Failed to save the search.");
    } finally {
      setIsSavingQuery(false);
    }
  };

  const handleDeleteSearch = async (queryId: string): Promise<void> => {
    setIsDeletingQuery(true);
    setQueryError(null);
    setQuerySuccess(null);
    try {
      await deleteSearchQuery(queryId);
      if (selectedQueryId === queryId) {
        handleNewSearch();
      }
      await refreshDiscovery();
      setQuerySuccess("Saved search deleted.");
    } catch {
      setQueryError("Failed to delete the search.");
    } finally {
      setIsDeletingQuery(false);
    }
  };

  const handleToggleSearchEnabled = async (query: JobSearchQuery): Promise<void> => {
    setQueryError(null);
    setQuerySuccess(null);
    try {
      await updateSearchQuery(query.id, { enabled: !query.enabled });
      await refreshDiscovery();
    } catch {
      setQueryError("Failed to update search state.");
    }
  };

  const handlePreviewSearch = async (): Promise<void> => {
    const payload = toSearchQueryDraft(queryForm);
    if (!payload.query) {
      setQueryError("Enter a search query before previewing.");
      return;
    }
    if (payload.sourceOrigin === "linkedin" && payload.provider !== "serpapi") {
      setQueryError("LinkedIn searches must use the SerpApi provider.");
      return;
    }

    setIsPreviewingQuery(true);
    setQueryError(null);
    setQuerySuccess(null);
    try {
      const response = await previewSearchQuery(payload);
      setPreviewJobs(response.jobs);
      setQuerySuccess(`Previewed ${response.jobs.length} matching jobs.`);
    } catch {
      setQueryError("Failed to preview the search.");
    } finally {
      setIsPreviewingQuery(false);
    }
  };

  const handleRunSearch = async (): Promise<void> => {
    if (!selectedQueryId) {
      setQueryError("Save the search before running it.");
      return;
    }

    setIsRunningQuery(true);
    setQueryError(null);
    setQuerySuccess(null);
    try {
      const response = await runSearchQuery(selectedQueryId);
      setPreviewJobs(response.jobs);
      setQuerySuccess(
        `Run completed: ${response.fetchedCount} fetched, ${response.savedCount} saved, ${response.alertCount} alerts.`
      );
      await refreshDiscovery();
      await fetchJobsData();
      if (response.jobs[0]?.id) {
        setSelectedJobId(response.jobs[0].id);
      }
    } catch {
      setQueryError("Failed to run the saved search.");
    } finally {
      setIsRunningQuery(false);
    }
  };

  const handleAlertPreferenceSave = async (): Promise<void> => {
    if (!alertPreferences) {
      return;
    }

    setIsSavingAlertPreferences(true);
    setAlertPreferencesError(null);
    setAlertPreferencesSuccess(null);
    try {
      const saved = await updateAlertPreferences(alertPreferences);
      setAlertPreferences(saved);
      setAlertPreferencesSuccess("Alert preferences saved.");
    } catch {
      setAlertPreferencesError("Failed to save alert preferences.");
    } finally {
      setIsSavingAlertPreferences(false);
    }
  };

  const handleAlertPreferenceChange = (updates: Partial<JobAlertPreference>): void => {
    setAlertPreferences((current) => (current ? { ...current, ...updates } : current));
  };

  const handleGenerateDraft = async (): Promise<void> => {
    if (!selectedJobId) {
      return;
    }
    if (!template) {
      setDraftSuccess(null);
      setDraftError("Connect a placeholder-based template before generating a draft.");
      return;
    }
    setIsGeneratingDraft(true);
    setDraftError(null);
    setDraftSuccess(null);
    try {
      const response = await generateCvDraft({
        jobId: selectedJobId,
        summaryOnly: true
      });
      setDraftsByJobId((current) => ({ ...current, [response.jobId]: response }));
      setDraftSuccess("Draft generated. Review the summary before syncing.");
    } catch {
      setDraftError("Failed to generate tailored draft");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleDraftFieldChange = (token: string, value: string): void => {
    if (!selectedJobId) {
      return;
    }
    setDraftsByJobId((current) => {
      const existing = current[selectedJobId];
      if (!existing) {
        return current;
      }
      return {
        ...current,
        [selectedJobId]: {
          ...existing,
          fieldValues: { ...existing.fieldValues, [token]: value },
          previewState: { ...existing.previewState, [token]: value }
        }
      };
    });
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!selectedJobId || !draftsByJobId[selectedJobId]) {
      return;
    }
    const currentDraft = draftsByJobId[selectedJobId];
    setIsSavingDraft(true);
    setDraftError(null);
    setDraftSuccess(null);
    try {
      const response = await updateGeneratedCvDraft(currentDraft.versionId, {
        fieldValues: currentDraft.fieldValues
      });
      setDraftsByJobId((current) => ({ ...current, [response.jobId]: response }));
      setDraftSuccess("Draft saved.");
    } catch {
      setDraftError("Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSyncDraft = async (): Promise<void> => {
    if (!selectedJobId || !draftsByJobId[selectedJobId]) {
      return;
    }
    const currentDraft = draftsByJobId[selectedJobId];
    setIsSyncingDraft(true);
    setDraftError(null);
    setDraftSuccess(null);
    try {
      await updateGeneratedCvDraft(currentDraft.versionId, {
        fieldValues: currentDraft.fieldValues
      });
      const syncedDraft = await syncGeneratedCvDraft(currentDraft.versionId);
      setDraftsByJobId((current) => ({ ...current, [syncedDraft.jobId]: syncedDraft }));
      setDraftSuccess("Draft synced into a copied Google Doc.");
      await fetchJobsData();
    } catch {
      setDraftError("Failed to sync draft to Google Docs");
    } finally {
      setIsSyncingDraft(false);
    }
  };

  const handleAction = (action: "approve" | "reject" | "snooze"): void => {
    if (!selectedJobId) {
      return;
    }
    const actionFn = { approve: approveJob, reject: rejectJob, snooze: snoozeJob }[action];
    const statusMap: Record<"approve" | "reject" | "snooze", ApprovalStatus> = {
      approve: "APPROVED",
      reject: "REJECTED",
      snooze: "SNOOZED"
    };
    startTransition(async () => {
      try {
        setActionError(null);
        await actionFn(selectedJobId);
        setStatuses((current) => ({ ...current, [selectedJobId]: statusMap[action] }));
      } catch {
        setActionError(`${action} failed`);
      }
    });
  };

  const getJobStatus = (job: Job): ApprovalStatus => statuses[job.id] ?? job.approvalStatus;
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const selectedApprovalStatus: ApprovalStatus = selectedJob ? getJobStatus(selectedJob) : "PENDING";
  const selectedDraft = selectedJobId ? draftsByJobId[selectedJobId] ?? null : null;
  const profileRequirementMessage =
    "Match score and saved-search polling stay disabled until your role, location, and skills are saved.";
  const setupToggleLabel = isSetupOpen ? "Hide console setup" : "Show console setup";

  if (isLoading) {
    return (
      <section className={CONSOLE_LAYOUT_CLASS}>
        <Card className={LEFT_RAIL_CARD_CLASS}>
          <div className="flex h-40 items-center justify-center">
            <span className="text-slate-500">Loading jobs...</span>
          </div>
        </Card>
        <Card className={DETAIL_CARD_CLASS}>
          <div className="flex h-40 items-center justify-center">
            <span className="text-slate-500">Loading...</span>
          </div>
        </Card>
      </section>
    );
  }

  if (fetchError) {
    return (
      <section className={CONSOLE_LAYOUT_CLASS}>
        <Card className={LEFT_RAIL_CARD_CLASS}>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{fetchError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => {
                void fetchJobsData();
              }}
            >
              Retry
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className={CONSOLE_LAYOUT_CLASS}>
      <Card className={LEFT_RAIL_CARD_CLASS}>
        <div className="order-1 space-y-3">
          {!profile ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs font-medium text-amber-900">{profileRequirementMessage}</p>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            aria-controls="approval-console-setup"
            aria-expanded={isSetupOpen}
            onClick={() => setIsSetupOpen((current) => !current)}
          >
            {setupToggleLabel}
          </Button>
        </div>

        <div className="order-2 flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Jobs ({total})</h2>
            <Badge className="border border-slate-200 bg-white text-slate-700">
              {statusFilter === "ALL" ? "All statuses" : statusFilter}
            </Badge>
          </div>
          <StatusFilter value={statusFilter} onChange={handleStatusChange} />
          {jobs.length === 0 ? (
            <p className="flex-1 py-8 text-center text-sm text-slate-500">
              {total > 0 ? "No jobs on this page" : "No jobs found"}
            </p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ul className="space-y-3">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left shadow-sm transition",
                        selectedJobId === job.id
                          ? "border-slate-900 bg-slate-100 shadow-none"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold leading-5 text-slate-900">{job.title}</p>
                        <p className="text-sm text-slate-600">
                          {job.company ? `${job.company} - ` : ""}
                          {job.location ?? "Unknown"}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-slate-100 text-slate-700">{getJobStatus(job)}</Badge>
                        <Badge className="border border-slate-200 bg-white text-slate-700">
                          {job.origin === "linkedin" ? "LinkedIn" : "All sources"}
                        </Badge>
                        {job.sourceLabel ? (
                          <Badge className="border border-slate-200 bg-white text-slate-700">
                            {job.sourceLabel}
                          </Badge>
                        ) : null}
                        {job.matchedQueryIds.length > 0 ? (
                          <Badge className="border border-slate-200 bg-white text-slate-700">
                            {job.matchedQueryIds.length} matched
                          </Badge>
                        ) : null}
                        {job.salary ? (
                          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                            {job.salary}
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {total > 0 ? (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={handlePageChange}
            />
          ) : null}
        </div>

        {isSetupOpen && (
          <div
            id="approval-console-setup"
            className="order-3 space-y-5 overflow-y-auto pr-1 lg:max-h-[40vh]"
          >
            <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Profile Onboarding</h2>
            <Badge
              className={
                profile
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-amber-200 bg-amber-50 text-amber-700"
              }
            >
              {profile ? "Configured" : "Required"}
            </Badge>
          </div>
          <p className="text-xs text-slate-600">{profileRequirementMessage}</p>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">Desired roles</span>
            <input
              aria-label="Desired roles"
              value={profileForm.desiredRoles}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, desiredRoles: event.target.value }))
              }
              placeholder="fullstack developer, backend engineer"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">Seniority</span>
            <select
              aria-label="Seniority"
              value={profileForm.seniority}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  seniority: event.target.value as UpsertProfileRequest["seniority"]
                }))
              }
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">Location</span>
            <input
              aria-label="Location"
              value={profileForm.location}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, location: event.target.value }))
              }
              placeholder="Israel"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">Must-have skills</span>
            <input
              aria-label="Must-have skills"
              value={profileForm.mustHaveSkills}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, mustHaveSkills: event.target.value }))
              }
              placeholder="TypeScript, React, NestJS"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              void handleProfileSave();
            }}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? "Saving..." : "Save Profile"}
          </Button>
          {profileSuccess ? <p className="text-xs text-emerald-700">{profileSuccess}</p> : null}
          {profileError ? <p className="text-xs text-red-700">{profileError}</p> : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Google Workspace</h2>
            <Badge
              className={
                googleStatus.connected
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-slate-200 bg-slate-50 text-slate-700"
              }
            >
              {googleStatus.connected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          {googleStatus.connected ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900">{googleStatus.email}</p>
              <p className="text-xs text-slate-600">
                Access expires {formatDateTime(googleStatus.expiresAt)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              Connect the tenant-owned Google account once. Generated CVs sync into copied docs,
              never the original template.
            </p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                void handleStartGoogleConnection();
              }}
              disabled={googleStatus.connected || isConnectingGoogle}
            >
              {isConnectingGoogle ? "Redirecting..." : "Connect Google Workspace"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                void handleDisconnectGoogle();
              }}
              disabled={!googleStatus.connected || isDisconnectingGoogle}
            >
              {isDisconnectingGoogle ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
          {googleSuccess ? <p className="text-xs text-emerald-700">{googleSuccess}</p> : null}
          {googleError ? <p className="text-xs text-red-700">{googleError}</p> : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Base Template</h2>
            {template ? (
              <Badge className="border border-sky-200 bg-sky-50 text-sky-700">
                {template.placeholders.length} placeholders
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-slate-600">
            The template must contain explicit <code>{"{{PLACEHOLDER}}"}</code> tokens. Sync only
            replaces those tokens and leaves the rest of the doc layout intact.
          </p>
          <input
            value={templateUrl}
            onChange={(event) => setTemplateUrl(event.target.value)}
            placeholder="https://docs.google.com/document/d/..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              void handleConnectTemplate();
            }}
            disabled={isConnectingTemplate}
          >
            {isConnectingTemplate ? "Connecting..." : "Connect Template Doc"}
          </Button>
          {template ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">
                  {template.documentTitle ?? template.title}
                </p>
                <p className="text-xs text-slate-600">
                  Latest template sync: {formatDateTime(template.lastSyncedAt)}
                </p>
              </div>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {templatePlaceholders.map((placeholder) => (
                  <div
                    key={placeholder.token}
                    className="space-y-3 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-sm font-semibold text-slate-900">
                        {`{{${placeholder.token}}}`}
                      </code>
                      <Badge className="border border-slate-200 bg-slate-50 text-slate-700">
                        {bindingLabel(placeholder.bindingType)}
                      </Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-xs">
                        <span className="font-medium text-slate-700">Binding type</span>
                        <select
                          aria-label={`Binding type for ${placeholder.token}`}
                          value={placeholder.bindingType}
                          onChange={(event) =>
                            handleBindingTypeChange(
                              placeholder.token,
                              event.target.value as CvPlaceholderBindingType
                            )
                          }
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="JOB_FIELD">Job field</option>
                          <option value="PROFILE_FIELD">Profile field</option>
                          <option value="GENERATED">Generated</option>
                          <option value="CUSTOM">Custom</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span className="font-medium text-slate-700">Source</span>
                        <select
                          aria-label={`Source for ${placeholder.token}`}
                          value={placeholder.sourceKey}
                          onChange={(event) =>
                            handleSourceKeyChange(
                              placeholder.token,
                              event.target.value as CvPlaceholderSourceKey
                            )
                          }
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          {SOURCE_OPTIONS[placeholder.bindingType].map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="grid gap-1 text-xs">
                      <span className="font-medium text-slate-700">Instructions</span>
                      <textarea
                        aria-label={`Instructions for ${placeholder.token}`}
                        value={placeholder.instructions ?? ""}
                        onChange={(event) =>
                          handleInstructionsChange(placeholder.token, event.target.value)
                        }
                        className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  void handleSavePlaceholderMapping();
                }}
                disabled={isSavingTemplate}
              >
                {isSavingTemplate ? "Saving..." : "Save Placeholder Mapping"}
              </Button>
            </div>
          ) : null}
          {templateSuccess ? <p className="text-xs text-emerald-700">{templateSuccess}</p> : null}
          {templateError ? <p className="text-xs text-red-700">{templateError}</p> : null}
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Saved Searches</h2>
              <Button type="button" variant="outline" onClick={handleNewSearch}>
                New Search
              </Button>
            </div>
            <p className="text-xs text-slate-600">
              Save LinkedIn-first searches, preview before saving, and let the console refresh in
              the background so new matches show up automatically.
            </p>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Query</span>
              <input
                aria-label="Search query"
                value={queryForm.query}
                onChange={(event) =>
                  setQueryForm((current) => ({ ...current, query: event.target.value }))
                }
                placeholder="software engineer, student, backend developer"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Provider</span>
                <select
                  aria-label="Search provider"
                  value={queryForm.provider}
                  disabled={queryForm.sourceOrigin === "linkedin"}
                  onChange={(event) =>
                    setQueryForm((current) => ({
                      ...current,
                      provider: event.target.value as JobSearchProvider
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="serpapi">SerpApi</option>
                  <option value="jsearch">JSearch</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Source origin</span>
                <select
                  aria-label="Source origin"
                  value={queryForm.sourceOrigin}
                  onChange={(event) =>
                    setQueryForm((current) => ({
                      ...current,
                      sourceOrigin: event.target.value as JobSearchSourceOrigin,
                      provider:
                        event.target.value === "linkedin" ? "serpapi" : current.provider
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All sources</option>
                  <option value="linkedin">LinkedIn only</option>
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Location</span>
                <input
                  aria-label="Search location"
                  value={queryForm.location}
                  onChange={(event) =>
                    setQueryForm((current) => ({ ...current, location: event.target.value }))
                  }
                  placeholder="Israel"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Seniority</span>
                <input
                  aria-label="Search seniority"
                  value={queryForm.seniority}
                  onChange={(event) =>
                    setQueryForm((current) => ({ ...current, seniority: event.target.value }))
                  }
                  placeholder="junior"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Include keywords</span>
                <input
                  aria-label="Include keywords"
                  value={queryForm.includeKeywords}
                  onChange={(event) =>
                    setQueryForm((current) => ({ ...current, includeKeywords: event.target.value }))
                  }
                  placeholder="TypeScript, React"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Exclude keywords</span>
                <input
                  aria-label="Exclude keywords"
                  value={queryForm.excludeKeywords}
                  onChange={(event) =>
                    setQueryForm((current) => ({ ...current, excludeKeywords: event.target.value }))
                  }
                  placeholder="senior, lead"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Posted within hours</span>
                <input
                  aria-label="Posted within hours"
                  type="number"
                  min="1"
                  max="168"
                  value={queryForm.postedWithinHours}
                  onChange={(event) =>
                    setQueryForm((current) => ({
                      ...current,
                      postedWithinHours: event.target.value
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Max results per run</span>
                <input
                  aria-label="Max results per run"
                  type="number"
                  min="1"
                  max="100"
                  value={queryForm.maxResultsPerRun}
                  onChange={(event) =>
                    setQueryForm((current) => ({
                      ...current,
                      maxResultsPerRun: event.target.value
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Minimum match score</span>
                <input
                  aria-label="Minimum match score"
                  type="number"
                  min="0"
                  max="100"
                  value={queryForm.minMatchScore}
                  onChange={(event) =>
                    setQueryForm((current) => ({
                      ...current,
                      minMatchScore: event.target.value
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Cadence seconds</span>
                <input
                  aria-label="Cadence seconds"
                  type="number"
                  min="60"
                  max="3600"
                  value={queryForm.cadenceSeconds}
                  onChange={(event) =>
                    setQueryForm((current) => ({
                      ...current,
                      cadenceSeconds: event.target.value
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                aria-label="Related titles"
                type="checkbox"
                checked={queryForm.relatedTitles}
                onChange={(event) =>
                  setQueryForm((current) => ({
                    ...current,
                    relatedTitles: event.target.checked
                  }))
                }
              />
              <span className="text-slate-700">Expand related titles automatically</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                aria-label="Search enabled"
                type="checkbox"
                checked={queryForm.enabled}
                onChange={(event) =>
                  setQueryForm((current) => ({ ...current, enabled: event.target.checked }))
                }
              />
              <span className="text-slate-700">Enabled</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handlePreviewSearch();
                }}
                disabled={isPreviewingQuery}
              >
                {isPreviewingQuery ? "Previewing..." : "Preview"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleSaveSearch();
                }}
                disabled={isSavingQuery}
              >
                {isSavingQuery
                  ? "Saving..."
                  : selectedQueryId
                    ? "Update Search"
                    : "Save Search"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handleRunSearch();
                }}
                disabled={!selectedQueryId || isRunningQuery}
              >
                {isRunningQuery ? "Running..." : "Run Now"}
              </Button>
            </div>
            {querySuccess ? <p className="text-xs text-emerald-700">{querySuccess}</p> : null}
            {queryError ? <p className="text-xs text-red-700">{queryError}</p> : null}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Saved Queries</h3>
              <span className="text-xs text-slate-500">{searchQueries.length} total</span>
            </div>
            {searchQueries.length === 0 ? (
              <p className="text-sm text-slate-500">No saved searches yet.</p>
            ) : (
              <div className="space-y-2">
                {searchQueries.map((query) => (
                  <div
                    key={query.id}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedQueryId === query.id
                        ? "border-slate-400 bg-slate-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => selectQuery(query)}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-medium text-slate-900">{query.query}</p>
                        <p className="text-xs text-slate-500">
                          {query.provider} · {query.sourceOrigin} · {query.location ?? "Any location"}
                        </p>
                      </button>
                      <Badge
                        className={
                          query.enabled
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-slate-200 bg-slate-50 text-slate-700"
                        }
                      >
                        {query.enabled ? "On" : "Off"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="bg-slate-100 text-slate-700">
                        {query.lastNewJobsCount} new
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-700">
                        {query.lastAlertedCount} alerts
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-700">
                        Every {query.cadenceSeconds}s
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleToggleSearchEnabled(query);
                        }}
                      >
                        {query.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleRunSearch();
                        }}
                        disabled={selectedQueryId !== query.id || isRunningQuery}
                      >
                        Run
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteSearch(query.id);
                        }}
                        disabled={isDeletingQuery}
                      >
                          Delete
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Last run: {formatRelativeDate(query.lastCompletedAt ?? query.lastRunAt)}{" "}
                      {query.lastError ? `· Error: ${query.lastError}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Preview Results</h3>
              <span className="text-xs text-slate-500">{previewJobs.length} jobs</span>
            </div>
            {previewJobs.length === 0 ? (
              <p className="text-sm text-slate-500">Run a preview to inspect matching jobs.</p>
            ) : (
              <div className="space-y-2">
                {previewJobs.slice(0, 5).map((job) => (
                  <div key={`${job.externalId}-${job.url}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{job.title}</p>
                      <Badge className="bg-slate-100 text-slate-700">{job.origin}</Badge>
                      <Badge className="bg-slate-100 text-slate-700">{job.sourceLabel}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {job.company ?? "Unknown company"} · {job.location ?? "Unknown location"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="bg-slate-100 text-slate-700">
                        Score {job.matchScore ?? "n/a"}
                      </Badge>
                      {job.matchedQueryIds.length > 0 ? (
                        <Badge className="bg-slate-100 text-slate-700">
                          {job.matchedQueryIds.length} matched queries
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Alert Preferences</h3>
              <Badge className="bg-slate-100 text-slate-700">
                {alertPreferences?.emailEnabled ? "Email on" : "Email off"}
              </Badge>
            </div>
            {alertPreferences ? (
              <div className="grid gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    aria-label="Email alerts enabled"
                    type="checkbox"
                    checked={alertPreferences.emailEnabled}
                    onChange={(event) =>
                      handleAlertPreferenceChange({ emailEnabled: event.target.checked })
                    }
                  />
                  <span className="text-slate-700">Email alerts</span>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-800">Email address</span>
                  <input
                    aria-label="Alert email address"
                    value={alertPreferences.emailAddress ?? ""}
                    onChange={(event) =>
                      handleAlertPreferenceChange({
                        emailAddress: event.target.value || null
                      })
                    }
                    placeholder="alerts@example.com"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    aria-label="Immediate alerts"
                    type="checkbox"
                    checked={alertPreferences.immediateAlerts}
                    onChange={(event) =>
                      handleAlertPreferenceChange({ immediateAlerts: event.target.checked })
                    }
                  />
                  <span className="text-slate-700">Immediate alerts</span>
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-800">Minimum match score</span>
                    <input
                      aria-label="Alert minimum match score"
                      type="number"
                      min="0"
                      max="100"
                      value={alertPreferences.minMatchScore ?? ""}
                      onChange={(event) =>
                        handleAlertPreferenceChange({
                          minMatchScore: event.target.value ? Number(event.target.value) : null
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-800">Cooldown seconds</span>
                    <input
                      aria-label="Alert cooldown seconds"
                      type="number"
                      min="0"
                      max="86400"
                      value={alertPreferences.cooldownSeconds}
                      onChange={(event) =>
                        handleAlertPreferenceChange({
                          cooldownSeconds: Number(event.target.value)
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void handleAlertPreferenceSave();
                  }}
                  disabled={isSavingAlertPreferences}
                >
                  {isSavingAlertPreferences ? "Saving..." : "Save Alert Preferences"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Loading alert preferences...</p>
            )}
            {alertPreferencesSuccess ? (
              <p className="text-xs text-emerald-700">{alertPreferencesSuccess}</p>
            ) : null}
            {alertPreferencesError ? (
              <p className="text-xs text-red-700">{alertPreferencesError}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Recent Alerts</h3>
              <span className="text-xs text-slate-500">{alerts.length} recent</span>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500">No alerts yet.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{alert.job.title}</p>
                      <Badge className="bg-slate-100 text-slate-700">{alert.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {alert.job.company ?? "Unknown company"} · {alert.job.location ?? "Unknown location"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Query {alert.jobSearchQueryId} · {formatRelativeDate(alert.createdAt)}
                    </p>
                    {alert.deliveryError ? (
                      <p className="text-xs text-red-700">{alert.deliveryError}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
          </div>
        )}
      </Card>

      <Card className={DETAIL_CARD_CLASS}>
        <JobDetailPanel
          jobId={selectedJobId}
          approvalStatus={selectedApprovalStatus}
          onApprove={() => handleAction("approve")}
          onReject={() => handleAction("reject")}
          onSnooze={() => handleAction("snooze")}
          isPending={isPending}
          actionError={actionError}
          profileConfigured={Boolean(profile)}
          template={template}
          generatedDraft={selectedDraft}
          onGenerateDraft={() => {
            void handleGenerateDraft();
          }}
          onDraftFieldChange={handleDraftFieldChange}
          onSaveDraft={() => {
            void handleSaveDraft();
          }}
          onSyncDraft={() => {
            void handleSyncDraft();
          }}
          isGeneratingDraft={isGeneratingDraft}
          isSavingDraft={isSavingDraft}
          isSyncingDraft={isSyncingDraft}
          draftError={draftError}
          draftSuccess={draftSuccess}
        />
      </Card>
    </section>
  );
}
