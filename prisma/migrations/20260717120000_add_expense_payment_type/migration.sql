CREATE TYPE "PaymentType" AS ENUM ('DEBITO_PIX', 'CREDITO', 'NAO_INFORMADO');

ALTER TABLE "Expense"
ADD COLUMN "paymentType" "PaymentType" NOT NULL DEFAULT 'NAO_INFORMADO';

ALTER TABLE "RecurringRule"
ADD COLUMN "paymentType" "PaymentType" NOT NULL DEFAULT 'NAO_INFORMADO';

UPDATE "Expense" AS expense
SET "paymentType" = CASE
  WHEN method."type" = 'CARTAO' THEN 'CREDITO'::"PaymentType"
  WHEN method."id" IS NOT NULL THEN 'DEBITO_PIX'::"PaymentType"
  ELSE 'NAO_INFORMADO'::"PaymentType"
END
FROM "PaymentMethod" AS method
WHERE expense."paymentMethodId" = method."id";

UPDATE "RecurringRule" AS rule
SET "paymentType" = CASE
  WHEN method."type" = 'CARTAO' THEN 'CREDITO'::"PaymentType"
  WHEN method."id" IS NOT NULL THEN 'DEBITO_PIX'::"PaymentType"
  ELSE 'NAO_INFORMADO'::"PaymentType"
END
FROM "PaymentMethod" AS method
WHERE rule."paymentMethodId" = method."id";
