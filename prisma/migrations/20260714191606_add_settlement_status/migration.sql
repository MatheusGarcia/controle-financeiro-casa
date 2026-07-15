-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDENTE_DIVISAO', 'DIVIDIDA');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'PENDENTE_DIVISAO';
