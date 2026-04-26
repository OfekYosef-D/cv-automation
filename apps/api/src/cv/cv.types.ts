export const CV_PLACEHOLDER_BINDING_TYPES = [
  "JOB_FIELD",
  "PROFILE_FIELD",
  "GENERATED",
  "CUSTOM"
] as const;

export type CvPlaceholderBindingType = (typeof CV_PLACEHOLDER_BINDING_TYPES)[number];

export const CV_PLACEHOLDER_SOURCE_KEYS = [
  "title",
  "company",
  "location",
  "salary",
  "desiredRoles",
  "seniority",
  "profileLocation",
  "mustHaveSkills",
  "headline",
  "summary",
  "skillsBlock",
  "experienceBullets",
  "custom"
] as const;

export type CvPlaceholderSourceKey = (typeof CV_PLACEHOLDER_SOURCE_KEYS)[number];

export interface CvPlaceholderSchemaItem {
  token: string;
  bindingType: CvPlaceholderBindingType;
  sourceKey: CvPlaceholderSourceKey;
  instructions: string | null;
}

export interface GeneratedCvMetadata {
  fieldValues: Record<string, string>;
  previewState: Record<string, string>;
  syncStatus: "draft" | "synced";
}
