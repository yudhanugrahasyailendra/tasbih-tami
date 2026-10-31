// Impor tamu dari tamu.txt dan buat link pribadi. Jalankan di laptop Anda saja.
// SUPABASE_SERVICE_ROLE_KEY melewati RLS: jangan masukkan ke Vercel atau repository.
//
//   BASE_URL=http://localhost:3000 node --env-file=.env scripts/buat-tamu.mjs
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const URL_SUPABASE = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = (process.env.BASE_URL ?? "").replace(/\/$/, ""); // contoh: https://undangan-anda.vercel.app
if (!URL_SUPABASE || !SERVICE_KEY || !BASE) {
  console.error("Isi SUPABASE_URL (atau NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, dan BASE_URL");
  process.exit(1);
}

const supabase = createClient(URL_SUPABASE, SERVICE_KEY);

const slugify = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const acak = () => randomBytes(4).toString("hex").slice(0, 4);

const rows = readFileSync("tamu.txt", "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [name, group_label, pax] = l.split(";").map((x) => x?.trim());
    return {
      name,
      group_label: group_label || null,
      max_pax: Number(pax) || 2,
      slug: `${slugify(name) || "tamu"}-${acak()}`,
    };
  });

const { error } = await supabase.from("guests").insert(rows);
if (error) {
  console.error(error);
  process.exit(1);
}

// hasil: satu baris per tamu, siap ditempel ke WhatsApp
const out = rows.map((r) => `${r.name}\t${BASE}/undangan/${r.slug}`).join("\n");
writeFileSync("link-tamu.tsv", out);
console.log(`${rows.length} tamu dibuat. Hasil: link-tamu.tsv`);
