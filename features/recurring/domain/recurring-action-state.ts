import type { RecurringRuleField } from "./recurring-rule";

export type RecurringActionState = {
  conflict?: boolean;
  fieldErrors: Partial<Record<RecurringRuleField, string>>;
  message?: string;
  revision: number;
  status: "idle" | "error";
  values?: Record<string, string>;
};

export const initialRecurringActionState: RecurringActionState = {
  fieldErrors: {},
  revision: 0,
  status: "idle",
};
