import { createClient } from "@supabase/supabase-js";

/* Hanya anon key. Jangan pakai SUPABASE_SERVICE_ROLE_KEY di sini. */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
