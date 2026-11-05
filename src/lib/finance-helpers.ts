import type { InvoiceStatus } from "@prisma/client";

export interface ItemLike {
  quantity: number | string | { toString(): string };
  unitPrice: number | string | { toString(): string };
}

export function toNum(value: number | string | { toString(): string } | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function computeInvoiceTotals(
  items: ItemLike[],
  taxRate: number | string | { toString(): string } | null | undefined,
) {
  const subtotal = items.reduce((sum, i) => sum + toNum(i.quantity) * toNum(i.unitPrice), 0);
  const tax = toNum(taxRate);
  const taxAmount = (subtotal * tax) / 100;
  return {
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}

export interface PaidLike {
  amount: number | string | { toString(): string };
}

/** Total amount paid against an invoice. */
export function invoicePaid(payments: PaidLike[] | null | undefined): number {
  return (payments ?? []).reduce((sum, p) => sum + toNum(p.amount), 0);
}

export function invoiceBalance(invoice: {
  total: number | string | { toString(): string };
  payments: PaidLike[] | null | undefined;
}): number {
  return Math.max(0, toNum(invoice.total) - invoicePaid(invoice.payments));
}

/**
 * Effective status to display. Overdue is derived: any non-final status with
 * an outstanding balance past the due date reads as OVERDUE.
 */
export function getEffectiveStatus(invoice: {
  status: InvoiceStatus;
  dueDate: Date | string;
  total: number | string | { toString(): string };
  payments: PaidLike[] | null | undefined;
}): InvoiceStatus {
  if (invoice.status === "PAID" || invoice.status === "CANCELLED" || invoice.status === "DRAFT") {
    return invoice.status;
  }
  const balance = invoiceBalance(invoice);
  if (balance <= 0) return "PAID";
  const due = new Date(invoice.dueDate);
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  if (due.getTime() < today.getTime()) return "OVERDUE";
  return invoice.status === "PARTIAL" ? "PARTIAL" : "SENT";
}
