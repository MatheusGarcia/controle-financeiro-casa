-- Store staged spreadsheet rows before they are confirmed as expenses.
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredOn" DATE NOT NULL,
    "payer" "Person",
    "sharingType" "SharingType" NOT NULL DEFAULT 'COMPARTILHADA',
    "categoryName" TEXT NOT NULL,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Expense" ADD COLUMN "importItemId" TEXT;

CREATE UNIQUE INDEX "Expense_importItemId_key" ON "Expense"("importItemId");
CREATE INDEX "ImportItem_batchId_idx" ON "ImportItem"("batchId");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_importItemId_fkey"
  FOREIGN KEY ("importItemId") REFERENCES "ImportItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportItem" ADD CONSTRAINT "ImportItem_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
