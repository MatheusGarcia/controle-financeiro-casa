import { PaymentType, Person, SharingType } from "@prisma/client";

export type RecurringRuleField =
  | "amount"
  | "categoryId"
  | "description"
  | "dueDay"
  | "endsOn"
  | "payer"
  | "paymentType"
  | "sharingType"
  | "startsOn";

export type RecurringRuleInput = {
  amount: number;
  categoryId: string;
  description: string;
  dueDay: number;
  endsOn: Date | null;
  payer: Person;
  paymentType: PaymentType;
  sharingType: SharingType;
  startsOn: Date;
};

export class RecurringRuleFormError extends Error {
  constructor(public readonly field: RecurringRuleField, message: string) {
    super(message);
    this.name = "RecurringRuleFormError";
  }
}

function requiredText(formData: FormData, field: RecurringRuleField, message: string) {
  const value = formData.get(field)?.toString().trim();
  if (!value) throw new RecurringRuleFormError(field, message);
  return value;
}

function localDate(value: string, field: "startsOn" | "endsOn") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RecurringRuleFormError(field, "Informe uma data válida.");
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) {
    throw new RecurringRuleFormError(field, "Informe uma data válida.");
  }
  return date;
}

export function parseRecurringRuleForm(formData: FormData): RecurringRuleInput {
  const amount = Number(formData.get("amount"));
  const dueDay = Number(formData.get("dueDay"));
  const payer = requiredText(formData, "payer", "Escolha quem paga.") as Person;
  const paymentType = requiredText(formData, "paymentType", "Escolha a forma de pagamento.") as PaymentType;
  const sharingType = requiredText(formData, "sharingType", "Escolha a natureza.") as SharingType;
  const startsOn = localDate(requiredText(formData, "startsOn", "Informe quando a recorrência começa."), "startsOn");
  const endsOnValue = formData.get("endsOn")?.toString();
  const endsOn = endsOnValue ? localDate(endsOnValue, "endsOn") : null;

  if (!Number.isFinite(amount) || amount <= 0) throw new RecurringRuleFormError("amount", "Informe um valor maior que zero.");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new RecurringRuleFormError("dueDay", "Informe um dia entre 1 e 31.");
  if (!Object.values(Person).includes(payer)) throw new RecurringRuleFormError("payer", "Escolha quem paga.");
  if (paymentType !== PaymentType.DEBITO_PIX && paymentType !== PaymentType.CREDITO) throw new RecurringRuleFormError("paymentType", "Escolha Débito/Pix ou Crédito.");
  if (!Object.values(SharingType).includes(sharingType)) throw new RecurringRuleFormError("sharingType", "Escolha a natureza.");
  if (endsOn && endsOn < startsOn) throw new RecurringRuleFormError("endsOn", "A data final deve ser igual ou posterior à data inicial.");

  return {
    amount,
    categoryId: requiredText(formData, "categoryId", "Escolha uma categoria."),
    description: requiredText(formData, "description", "Informe uma descrição."),
    dueDay,
    endsOn,
    payer,
    paymentType,
    sharingType,
    startsOn,
  };
}

export function monthStart(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1, 12);
}

export function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 12);
}

export function previousMonthEnd(month: string) {
  const start = monthStart(month);
  return new Date(start.getFullYear(), start.getMonth(), 0, 12);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function recurringRuleStatus(rule: { active: boolean; endsOn: Date | null; startsOn: Date }, referenceMonth: string) {
  const reference = monthStart(referenceMonth);
  if (rule.endsOn && rule.endsOn < reference) return "ENDED" as const;
  if (!rule.active) return "PAUSED" as const;
  if (rule.startsOn > new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 12)) return "SCHEDULED" as const;
  return "ACTIVE" as const;
}

export function nextRecurringOccurrence(
  rule: { active: boolean; dueDay: number; endsOn: Date | null; startsOn: Date },
  referenceMonth: string,
  generatedDates: Date[],
) {
  if (!rule.active) return null;
  const reference = monthStart(referenceMonth);
  let candidate = monthStart(monthKey(rule.startsOn));
  if (candidate < reference) candidate = reference;
  const generatedMonths = new Set(generatedDates.map(monthKey));

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const lastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
    const occurrence = new Date(candidate.getFullYear(), candidate.getMonth(), Math.min(rule.dueDay, lastDay), 12);
    if (occurrence < rule.startsOn) {
      candidate = nextMonth(candidate);
      continue;
    }
    if (rule.endsOn && occurrence > rule.endsOn) return null;
    if (!generatedMonths.has(monthKey(candidate))) {
      return occurrence;
    }
    candidate = nextMonth(candidate);
  }
  return null;
}
