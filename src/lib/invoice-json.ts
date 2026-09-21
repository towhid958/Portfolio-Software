/**
 * Shapes for the invoices table's `Json` columns.
 *
 * `billing_to` and `last_email_status` are untyped JSON in the database, so
 * the generated types give `Json | null`. Rather than `as any` at every
 * property access (which silently permits typos like `.emial`), each call
 * site narrows once through these.
 */
export type InvoiceBillingTo = {
  name?: string | null;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
};

export type InvoiceEmailStatus = {
  success?: boolean;
  type?: string;
  error?: string;
  sent_at?: string;
};

export function asBillingTo(value: unknown): InvoiceBillingTo | null {
  return value && typeof value === 'object' ? (value as InvoiceBillingTo) : null;
}

export function asEmailStatus(value: unknown): InvoiceEmailStatus | null {
  return value && typeof value === 'object' ? (value as InvoiceEmailStatus) : null;
}

/** A line item in the invoices table's untyped `items` Json column. */
export type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  total: number;
};

export function asInvoiceItems(value: unknown): InvoiceItem[] | null {
  return Array.isArray(value) ? (value as InvoiceItem[]) : null;
}
