-- Preserve existing address and district values while allowing map-only reports.
ALTER TABLE "RepairRequest" ALTER COLUMN "address" DROP NOT NULL;
ALTER TABLE "RepairRequest" ALTER COLUMN "district" DROP NOT NULL;
