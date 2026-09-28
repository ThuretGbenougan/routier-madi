ALTER TABLE "User" ADD COLUMN "accountActivated" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "ContractorInvitation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "language" TEXT NOT NULL,
  "delivery" TEXT NOT NULL DEFAULT 'PENDING',
  "messageId" TEXT,
  CONSTRAINT "ContractorInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContractorInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContractorInvitation_userId_key" ON "ContractorInvitation"("userId");
CREATE UNIQUE INDEX "ContractorInvitation_tokenHash_key" ON "ContractorInvitation"("tokenHash");
