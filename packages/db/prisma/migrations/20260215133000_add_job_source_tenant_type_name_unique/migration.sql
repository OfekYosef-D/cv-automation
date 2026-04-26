-- Pre-migration dedupe for JobSource(tenantId, type, name)
-- 1) Pick a keeper row for each duplicate tuple (oldest createdAt, then smallest id)
-- 2) Move dependent Job rows to the keeper
-- 3) Resolve job uniqueness conflicts on (jobSourceId, externalId)
-- 4) Delete duplicate JobSource rows

WITH ranked_sources AS (
	SELECT
		id,
		"tenantId",
		type,
		name,
		"createdAt",
		ROW_NUMBER() OVER (
			PARTITION BY "tenantId", type, name
			ORDER BY "createdAt" ASC, id ASC
		) AS rn
	FROM "JobSource"
),
source_map AS (
	SELECT
		dup.id AS duplicate_id,
		keep.id AS keep_id
	FROM ranked_sources dup
	JOIN ranked_sources keep
		ON keep."tenantId" = dup."tenantId"
	 AND keep.type = dup.type
	 AND keep.name = dup.name
	 AND keep.rn = 1
	WHERE dup.rn > 1
),
conflicting_jobs AS (
	SELECT dup_job.id
	FROM "Job" dup_job
	JOIN source_map map ON map.duplicate_id = dup_job."jobSourceId"
	JOIN "Job" keep_job
		ON keep_job."jobSourceId" = map.keep_id
	 AND keep_job."externalId" = dup_job."externalId"
)
DELETE FROM "Job" j
USING conflicting_jobs cj
WHERE j.id = cj.id;

WITH ranked_sources AS (
	SELECT
		id,
		"tenantId",
		type,
		name,
		"createdAt",
		ROW_NUMBER() OVER (
			PARTITION BY "tenantId", type, name
			ORDER BY "createdAt" ASC, id ASC
		) AS rn
	FROM "JobSource"
),
source_map AS (
	SELECT
		dup.id AS duplicate_id,
		keep.id AS keep_id
	FROM ranked_sources dup
	JOIN ranked_sources keep
		ON keep."tenantId" = dup."tenantId"
	 AND keep.type = dup.type
	 AND keep.name = dup.name
	 AND keep.rn = 1
	WHERE dup.rn > 1
)
UPDATE "Job" j
SET "jobSourceId" = map.keep_id
FROM source_map map
WHERE j."jobSourceId" = map.duplicate_id;

WITH ranked_sources AS (
	SELECT
		id,
		"tenantId",
		type,
		name,
		"createdAt",
		ROW_NUMBER() OVER (
			PARTITION BY "tenantId", type, name
			ORDER BY "createdAt" ASC, id ASC
		) AS rn
	FROM "JobSource"
)
DELETE FROM "JobSource" js
USING ranked_sources rs
WHERE js.id = rs.id
	AND rs.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "JobSource_tenantId_type_name_key" ON "JobSource"("tenantId", "type", "name");
