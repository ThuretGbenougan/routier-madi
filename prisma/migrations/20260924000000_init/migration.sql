-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CONTRACTOR');
CREATE TYPE "SessionClient" AS ENUM ('WEB', 'TAURI');
CREATE TYPE "RequestStatus" AS ENUM ('CREATED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CONTROLLED', 'CLOSED', 'REJECTED');
CREATE TYPE "ProblemType" AS ENUM ('POTHOLE', 'PAVEMENT', 'CRACK', 'SIDEWALK', 'DRAINAGE', 'MARKING', 'OTHER');
CREATE TYPE "PhotoKind" AS ENUM ('CITIZEN', 'BEFORE', 'AFTER');
CREATE TYPE "HistoryActorRole" AS ENUM ('CITIZEN', 'ADMIN', 'CONTRACTOR');
CREATE TYPE "NoteVisibility" AS ENUM ('INTERNAL', 'CONTRACTOR');
CREATE TYPE "MlAnalysisStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL, "emailNormalized" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "contractorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "client" "SessionClient" NOT NULL, "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Contractor" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "specialty" TEXT NOT NULL, "contact" TEXT NOT NULL, "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RepairRequest" (
  "id" TEXT NOT NULL, "serial" BIGSERIAL NOT NULL, "reference" TEXT, "trackingTokenHash" TEXT NOT NULL,
  "problemType" "ProblemType" NOT NULL, "address" TEXT NOT NULL, "district" TEXT NOT NULL, "description" TEXT NOT NULL,
  "latitude" DECIMAL(9,6) NOT NULL, "longitude" DECIMAL(9,6) NOT NULL, "citizenName" TEXT, "citizenEmail" TEXT,
  "status" "RequestStatus" NOT NULL DEFAULT 'CREATED', "contractorId" TEXT, "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepairRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Photo" (
  "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "kind" "PhotoKind" NOT NULL, "label" TEXT NOT NULL,
  "storageProvider" TEXT NOT NULL, "storageKey" TEXT NOT NULL, "deliveryUrl" TEXT, "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL, "width" INTEGER NOT NULL, "height" INTEGER NOT NULL, "sha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RequestHistory" (
  "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "fromStatus" "RequestStatus", "toStatus" "RequestStatus" NOT NULL,
  "actorUserId" TEXT, "actorLabel" TEXT NOT NULL, "actorRole" "HistoryActorRole" NOT NULL, "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RequestHistory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Note" (
  "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "visibility" "NoteVisibility" NOT NULL,
  "body" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ControlResult" (
  "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "inspectorId" TEXT NOT NULL, "passed" BOOLEAN NOT NULL,
  "comment" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ControlResult_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MlAnalysis" (
  "id" TEXT NOT NULL, "photoId" TEXT NOT NULL, "status" "MlAnalysisStatus" NOT NULL DEFAULT 'PENDING',
  "modelVersion" TEXT, "durationMs" DOUBLE PRECISION, "failureCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "MlAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MlDetection" (
  "id" TEXT NOT NULL, "analysisId" TEXT NOT NULL, "label" TEXT NOT NULL, "confidence" DOUBLE PRECISION NOT NULL,
  "x1" DOUBLE PRECISION NOT NULL, "y1" DOUBLE PRECISION NOT NULL, "x2" DOUBLE PRECISION NOT NULL, "y2" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "MlDetection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_emailNormalized_key" ON "User"("emailNormalized");
CREATE INDEX "User_contractorId_idx" ON "User"("contractorId");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE UNIQUE INDEX "Contractor_email_key" ON "Contractor"("email");
CREATE UNIQUE INDEX "RepairRequest_serial_key" ON "RepairRequest"("serial");
CREATE UNIQUE INDEX "RepairRequest_reference_key" ON "RepairRequest"("reference");
CREATE UNIQUE INDEX "RepairRequest_trackingTokenHash_key" ON "RepairRequest"("trackingTokenHash");
CREATE INDEX "RepairRequest_status_updatedAt_idx" ON "RepairRequest"("status", "updatedAt");
CREATE INDEX "RepairRequest_contractorId_status_idx" ON "RepairRequest"("contractorId", "status");
CREATE INDEX "RepairRequest_createdAt_idx" ON "RepairRequest"("createdAt");
CREATE UNIQUE INDEX "Photo_storageKey_key" ON "Photo"("storageKey");
CREATE INDEX "Photo_requestId_createdAt_idx" ON "Photo"("requestId", "createdAt");
CREATE INDEX "RequestHistory_requestId_createdAt_idx" ON "RequestHistory"("requestId", "createdAt");
CREATE INDEX "Note_requestId_visibility_createdAt_idx" ON "Note"("requestId", "visibility", "createdAt");
CREATE UNIQUE INDEX "ControlResult_requestId_key" ON "ControlResult"("requestId");
CREATE UNIQUE INDEX "MlAnalysis_photoId_key" ON "MlAnalysis"("photoId");
CREATE INDEX "MlDetection_analysisId_idx" ON "MlDetection"("analysisId");

ALTER TABLE "User" ADD CONSTRAINT "User_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepairRequest" ADD CONSTRAINT "RepairRequest_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RepairRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestHistory" ADD CONSTRAINT "RequestHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RepairRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestHistory" ADD CONSTRAINT "RequestHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RepairRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ControlResult" ADD CONSTRAINT "ControlResult_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RepairRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ControlResult" ADD CONSTRAINT "ControlResult_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MlAnalysis" ADD CONSTRAINT "MlAnalysis_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MlDetection" ADD CONSTRAINT "MlDetection_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "MlAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
