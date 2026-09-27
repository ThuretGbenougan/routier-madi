ALTER TYPE "MlAnalysisStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "MlAnalysisStatus" ADD VALUE 'SKIPPED';
ALTER TABLE "RepairRequest" ADD COLUMN "interventionCycle" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Photo" ADD COLUMN "cycle" INTEGER NOT NULL DEFAULT 1;
DROP INDEX "ControlResult_requestId_key";
ALTER TABLE "ControlResult" ADD COLUMN "cycle" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "MlAnalysis" ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "leaseToken" TEXT, ADD COLUMN "leaseUntil" TIMESTAMP(3),
 ADD COLUMN "imageWidth" INTEGER, ADD COLUMN "imageHeight" INTEGER;
CREATE TABLE "PhotoUpload" (
 "id" TEXT NOT NULL PRIMARY KEY, "requestId" TEXT NOT NULL,
 "actorKey" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
 "kind" "PhotoKind" NOT NULL, "cycle" INTEGER NOT NULL,
 "storageKey" TEXT NOT NULL, "label" TEXT NOT NULL, "photoId" TEXT,
 "expiresAt" TIMESTAMP(3) NOT NULL, "cleanedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("requestId") REFERENCES "RepairRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PhotoUpload_storageKey_key" ON "PhotoUpload"("storageKey");
CREATE UNIQUE INDEX "PhotoUpload_photoId_key" ON "PhotoUpload"("photoId");
CREATE UNIQUE INDEX "PhotoUpload_requestId_actorKey_idempotencyKey_key" ON "PhotoUpload"("requestId", "actorKey", "idempotencyKey");
CREATE INDEX "PhotoUpload_expiresAt_idx" ON "PhotoUpload"("expiresAt");
CREATE TABLE "MlOutbox" (
 "id" TEXT NOT NULL PRIMARY KEY, "analysisId" TEXT NOT NULL, "generation" INTEGER NOT NULL,
 "messageId" TEXT, "publishedAt" TIMESTAMP(3), "publishingUntil" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("analysisId") REFERENCES "MlAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MlOutbox_analysisId_generation_key" ON "MlOutbox"("analysisId", "generation");
CREATE INDEX "MlOutbox_publishedAt_createdAt_idx" ON "MlOutbox"("publishedAt", "createdAt");
CREATE TABLE "RateBucket" ("key" TEXT NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "RateBucket_expiresAt_idx" ON "RateBucket"("expiresAt");
