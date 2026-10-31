"use server";

import { z } from "zod";
import { getGuest } from "./_lib/guests";
import { supabase } from "./_lib/supabase";
import type { SendResult, Wish } from "./_lib/wishes";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(500),
  attendance: z.enum(["hadir", "tidak", "ragu"]).optional(),
  pax: z.coerce.number().int().min(1).max(10).optional(),
  slug: z.string().max(80).optional(),
});

export async function kirimUcapan(formData: FormData): Promise<SendResult> {
  // honeypot: bot mengisi field tersembunyi ini
  if (formData.get("website")) return { ok: true };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    message: formData.get("message"),
    attendance: formData.get("attendance") || undefined,
    pax: formData.get("pax") || undefined,
    slug: formData.get("slug") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Nama dan ucapan wajib diisi (ucapan maksimal 500 karakter)." };
  }
  const { slug, pax, ...rest } = parsed.data;

  // guest_id dan batas max_pax tidak dipercaya dari form: server mencari tamu lagi lewat slug
  let guestId: string | null = null;
  let finalPax: number | null = null;
  if (slug) {
    const guest = await getGuest(slug);
    if (guest) {
      guestId = guest.id;
      if (pax) finalPax = Math.min(pax, guest.max_pax);
    }
  }

  const { error } = await supabase.from("wishes").insert({ ...rest, guest_id: guestId, pax: finalPax });
  if (error) {
    console.error("kirimUcapan:", error.code, error.message);
    return { ok: false, error: "Ucapan gagal dikirim. Coba lagi sebentar." };
  }
  return { ok: true };
}

export async function ambilUcapan(): Promise<Wish[]> {
  const { data } = await supabase
    .from("wishes")
    .select("id, name, message, attendance, pax, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Wish[];
}
