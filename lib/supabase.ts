import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

/**
 * Tarayıcı istemcisi. Oturum localStorage'da tutulur ve otomatik yenilenir:
 * sayfa yenilense de kullanıcı oturumda kalır.
 */
export const supabase: SupabaseClient = createClient(url || "http://localhost:54321", key || "public-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  realtime: { params: { eventsPerSecond: 10 } },
});
