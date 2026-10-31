import { supabase } from "./supabase";

export type Guest = { id: string; name: string; max_pax: number };

/** Satu tamu per slug lewat fungsi get_guest (tabel guests tidak bisa dibaca langsung oleh anon). */
export async function getGuest(slug: string): Promise<Guest | null> {
  const { data, error } = await supabase.rpc("get_guest", { p_slug: slug }).maybeSingle();
  if (error) {
    console.error("getGuest:", error.code, error.message);
    return null;
  }
  return (data as Guest | null) ?? null;
}
