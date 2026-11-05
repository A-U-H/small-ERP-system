export const INVOICE_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "SENT", label: "Unpaid", color: "bg-amber-100 text-amber-700" },
  { value: "PARTIAL", label: "Partially paid", color: "bg-blue-100 text-blue-700" },
  { value: "PAID", label: "Paid", color: "bg-emerald-100 text-emerald-700" },
  { value: "OVERDUE", label: "Overdue", color: "bg-rose-100 text-rose-700" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-slate-100 text-slate-700 line-through" },
] as const;

export const INVOICE_STATUS_MAP = Object.fromEntries(
  INVOICE_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof INVOICE_STATUSES)[number]>;

export const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
] as const;

export const PAYMENT_METHOD_MAP = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m]),
) as Record<string, (typeof PAYMENT_METHODS)[number]>;

export const EXPENSE_PAID_BY = [
  { value: "COMPANY", label: "Company" },
  { value: "EMPLOYEE", label: "Employee" },
] as const;

export const EXPENSE_PAID_BY_MAP = Object.fromEntries(
  EXPENSE_PAID_BY.map((e) => [e.value, e]),
) as Record<string, (typeof EXPENSE_PAID_BY)[number]>;
