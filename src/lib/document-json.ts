/**
 * Shape for client_documents.metadata, which is an untyped `Json` column.
 *
 * Both the client dashboard and the admin document manager read
 * `uploaded_by` to tell client uploads apart from staff uploads, so the
 * narrowing lives here rather than being re-declared (or `as any`-ed) in
 * each route.
 */
export type DocumentMetadata = {
  uploaded_by?: string;
  original_name?: string;
  timestamp?: string;
};

export function asDocumentMetadata(value: unknown): DocumentMetadata | null {
  return value && typeof value === 'object' ? (value as DocumentMetadata) : null;
}
