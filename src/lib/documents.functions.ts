import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSecureDownloadUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ documentId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // 1. Verify access in public.client_documents
    const { data: doc, error: docError } = await supabaseAdmin
      .from('client_documents')
      .select('file_url, user_id')
      .eq('id', data.documentId)
      .single();

    if (docError || !doc) {
      throw new Error("Document not found");
    }

    // 2. check if user is owner or admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const isAdmin = roles?.some(r => ['admin', 'super_admin', 'editor'].includes(r.role));
    const isOwner = doc.user_id === userId;

    if (!isAdmin && !isOwner) {
      throw new Error("Unauthorized access to this document");
    }

    // 3. Generate signed URL - lifetime from Settings > Documents > "Signed
    // link lifetime (minutes)" (previously hardcoded to 5 regardless).
    const { data: configRow } = await supabaseAdmin
      .from('site_configuration')
      .select('value')
      .eq('key', 'signed_link_minutes')
      .maybeSingle();
    const linkMinutes = typeof configRow?.value === 'number' ? configRow.value : 5;

    // file_url now stores the path (e.g. userId/filename)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('client-documents-vault-private')
      .createSignedUrl(doc.file_url, 60 * linkMinutes);

    if (signedError || !signedData) {
      throw new Error("Failed to generate secure link");
    }

    return { signedUrl: signedData.signedUrl };
  });
