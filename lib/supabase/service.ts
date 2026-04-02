import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";

let serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceRoleClient() {
  if (serviceClient) {
    return serviceClient;
  }

  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();
  serviceClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  return serviceClient;
}
