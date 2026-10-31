# Plan: Nama Tamu di Cover Undangan (Next.js + Supabase)

Tujuan: setiap tamu punya link pribadi `/undangan/budi-santoso-x7k2`. Nama tamu tampil di cover ("Kepada Yth. Budi Santoso"), terisi otomatis di form ucapan, dan jumlah hadir dibatasi sesuai `max_pax`.

Prasyarat: tabel `wishes` dari `rencana-ucapan-supabase.md` sudah ada, dan project Next.js (App Router, versi 15 ke atas) sudah terhubung ke Supabase.

## Keputusan desain

| Hal | Keputusan | Alasan |
| --- | --- | --- |
| Identitas tamu | slug acak di URL | nama tidak bisa dipalsukan, link tamu lain tidak bisa ditebak |
| Akses tabel `guests` | RLS aktif **tanpa policy**; baca lewat fungsi `get_guest(slug)` | anon key tidak bisa mengunduh seluruh daftar tamu, hanya satu tamu per slug |
| Pembuatan data tamu | skrip lokal memakai `service_role` key | key ini tidak pernah masuk ke aplikasi atau Vercel |
| Link tidak dikenal | tampilkan sapaan umum, bukan error | link salah ketik tidak merusak undangan |
| Cadangan | `/?to=Nama` tetap jalan | tamu dadakan di luar daftar |

## Bagian A. Setup Supabase

Jalankan di **SQL Editor**.

### A1. Tabel `guests`
```sql
create table guests (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null check (char_length(name) between 1 and 60),
  group_label text,
  max_pax int not null default 2 check (max_pax between 1 and 10),
  created_at timestamptz default now()
);

-- RLS aktif TANPA policy: anon tidak bisa select/insert/update/delete langsung
alter table guests enable row level security;
```

### A2. Fungsi baca satu tamu berdasarkan slug
```sql
create or replace function get_guest(p_slug text)
returns table (id uuid, name text, max_pax int)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.max_pax
  from guests g
  where g.slug = p_slug
  limit 1
$$;

revoke all on function get_guest(text) from public;
grant execute on function get_guest(text) to anon, authenticated;
```

### A3. Kolom tambahan di `wishes`
```sql
alter table wishes
  add column guest_id uuid references guests(id) on delete set null,
  add column pax int check (pax between 1 and 10);
```

### A4. Verifikasi keamanan
Dengan anon key, ambil `guests` langsung. Hasilnya harus kosong:
```bash
curl "https://XXXX.supabase.co/rest/v1/guests?select=*" \
  -H "apikey: ANON_KEY" -H "Authorization: Bearer ANON_KEY"
# harapan: []
```

## Bagian B. Kode Next.js

### B1. Struktur file
```
src/
  lib/supabase.ts                 (sudah ada)
  app/
    page.tsx                      (ubah: pakai <Invitation>)
    actions.ts                    (ubah: terima slug dan pax)
    undangan/[slug]/page.tsx      (baru)
  components/
    Invitation.tsx                (baru: isi undangan bersama)
    WishForm.tsx                  (ubah)
    WishList.tsx                  (sudah ada)
scripts/
  buat-tamu.mjs                   (baru: impor tamu dan buat link)
```

### B2. `src/components/Invitation.tsx`
Satu komponen dipakai oleh dua halaman, supaya isi undangan tidak diduplikasi.

```tsx
import WishForm from '@/components/WishForm'
import WishList from '@/components/WishList'

type Props = { tamu?: string; slug?: string; maxPax?: number }

export default function Invitation({ tamu, slug, maxPax }: Props) {
  return (
    <main>
      {/* ...cover dan bagian undangan lain... */}
      <p>Kepada Yth.</p>
      <h1>{tamu ?? 'Bapak/Ibu/Saudara/i'}</h1>

      <WishForm defaultName={tamu} slug={slug} maxPax={maxPax} />
      <WishList />
    </main>
  )
}
```

Nama tamu selalu ditampilkan sebagai teks biasa. Atur gaya `h1` agar nama panjang turun baris dengan rapi (`overflow-wrap: anywhere` dan ukuran font yang mengecil di layar sempit).

### B3. `src/app/undangan/[slug]/page.tsx`
```tsx
import type { Metadata } from 'next'
import Invitation from '@/components/Invitation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// halaman tamu tidak boleh masuk hasil pencarian
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: guest } = await supabase
    .rpc('get_guest', { p_slug: slug })
    .maybeSingle()

  // slug tidak dikenal: tetap tampil, dengan sapaan umum
  return (
    <Invitation
      tamu={guest?.name}
      slug={guest ? slug : undefined}
      maxPax={guest?.max_pax}
    />
  )
}
```

### B4. `src/app/page.tsx` (cadangan `?to=`)
```tsx
import Invitation from '@/components/Invitation'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>
}) {
  const { to } = await searchParams
  return <Invitation tamu={to?.slice(0, 60)} />
}
```

### B5. `src/app/actions.ts` (Server Action, versi baru)
Server mencari tamu lagi berdasarkan slug. Nama, `guest_id`, dan batas `max_pax` tidak dipercaya dari form.

```ts
'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(500),
  attendance: z.enum(['hadir', 'tidak', 'ragu']).optional(),
  pax: z.coerce.number().int().min(1).max(10).optional(),
  slug: z.string().max(80).optional(),
})

export type FormState = { ok: boolean; error?: string }

export async function kirimUcapan(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  if (formData.get('website')) return { ok: true } // honeypot

  const parsed = schema.safeParse({
    name: formData.get('name'),
    message: formData.get('message'),
    attendance: formData.get('attendance') || undefined,
    pax: formData.get('pax') || undefined,
    slug: formData.get('slug') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: 'Nama dan ucapan wajib diisi (ucapan maksimal 500 karakter).' }
  }
  const { slug, pax, ...rest } = parsed.data

  let guestId: string | null = null
  let finalPax: number | null = null
  if (slug) {
    const { data: guest } = await supabase
      .rpc('get_guest', { p_slug: slug })
      .maybeSingle()
    if (guest) {
      guestId = guest.id
      if (pax) finalPax = Math.min(pax, guest.max_pax)
    }
  }

  const { error } = await supabase
    .from('wishes')
    .insert({ ...rest, guest_id: guestId, pax: finalPax })
  if (error) return { ok: false, error: 'Ucapan gagal dikirim. Coba lagi sebentar.' }

  revalidatePath('/')
  return { ok: true }
}
```

### B6. `src/components/WishForm.tsx` (versi baru)
```tsx
'use client'
import { useActionState } from 'react'
import { kirimUcapan, type FormState } from '@/app/actions'

type Props = { defaultName?: string; slug?: string; maxPax?: number }

export default function WishForm({ defaultName = '', slug, maxPax }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    kirimUcapan,
    { ok: false }
  )

  return (
    <form action={action}>
      {slug && <input type="hidden" name="slug" value={slug} />}

      <input name="name" defaultValue={defaultName} maxLength={60} required placeholder="Nama" />
      <textarea name="message" maxLength={500} required placeholder="Ucapan dan doa" />

      <select name="attendance" defaultValue="">
        <option value="">Konfirmasi kehadiran</option>
        <option value="hadir">Hadir</option>
        <option value="tidak">Tidak hadir</option>
        <option value="ragu">Belum pasti</option>
      </select>

      {maxPax && (
        <select name="pax" defaultValue="1" aria-label="Jumlah yang hadir">
          {Array.from({ length: maxPax }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1} orang</option>
          ))}
        </select>
      )}

      {/* honeypot */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        style={{ position: 'absolute', left: '-9999px' }}
      />

      <button disabled={pending}>{pending ? 'Mengirim...' : 'Kirim ucapan'}</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.ok && <p role="status">Terima kasih, ucapan Anda sudah terkirim.</p>}
    </form>
  )
}
```

## Bagian C. Impor tamu dan buat link

Skrip ini dijalankan **di laptop Anda saja**. `service_role` key dilewati RLS dan tidak boleh masuk Vercel, `.env.local`, atau repository.

### C1. File `tamu.txt`
Satu tamu per baris, format `nama;kelompok;jumlah` (kelompok dan jumlah boleh kosong, jumlah bawaan 2):
```
Budi Santoso;Keluarga;4
Siti Rahma;Kantor;2
Andi Pratama & Istri;Teman;2
```

### C2. `scripts/buat-tamu.mjs`
```js
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const URL_SUPABASE = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.BASE_URL // contoh: https://undangan-anda.vercel.app
if (!URL_SUPABASE || !SERVICE_KEY || !BASE) {
  console.error('Isi SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BASE_URL')
  process.exit(1)
}

const supabase = createClient(URL_SUPABASE, SERVICE_KEY)

const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const acak = () => randomBytes(4).toString('hex').slice(0, 4)

const rows = readFileSync('tamu.txt', 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [name, group_label, pax] = l.split(';').map((x) => x?.trim())
    return {
      name,
      group_label: group_label || null,
      max_pax: Number(pax) || 2,
      slug: `${slugify(name)}-${acak()}`,
    }
  })

const { error } = await supabase.from('guests').insert(rows)
if (error) {
  console.error(error)
  process.exit(1)
}

// hasil: satu baris per tamu, siap ditempel ke WhatsApp
const out = rows
  .map((r) => `${r.name}\t${BASE}/undangan/${r.slug}`)
  .join('\n')
writeFileSync('link-tamu.tsv', out)
console.log(`${rows.length} tamu dibuat. Hasil: link-tamu.tsv`)
```

Jalankan:
```bash
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
BASE_URL=https://undangan-anda.vercel.app \
node scripts/buat-tamu.mjs
```

Tambahkan `tamu.txt` dan `link-tamu.tsv` ke `.gitignore` karena berisi data pribadi.

### C3. Teks WhatsApp
Contoh yang bisa dibuat dari `link-tamu.tsv` (ganti `{nama}` dan `{link}`):
```
Kepada Yth. {nama}

Dengan hormat, kami mengundang Bapak/Ibu/Saudara/i
untuk hadir di acara pernikahan kami.

Detail undangan:
{link}

Terima kasih.
```

## Bagian D. Uji

1. **Link valid:** buka `/undangan/<slug>`; cover menampilkan nama tamu, form terisi nama, pilihan jumlah sesuai `max_pax`.
2. **Link tidak dikenal:** `/undangan/ngawur`; tampil sapaan umum tanpa error, form tanpa pilihan jumlah.
3. **Cadangan `?to=`:** `/?to=Budi+Santoso` menampilkan nama.
4. **Kirim ucapan dari link tamu:** baris di `wishes` punya `guest_id` terisi dan `pax` tidak melebihi `max_pax`. Coba manipulasi `pax=9` lewat dev tools; tersimpan sebagai `max_pax`.
5. **Keamanan:** query `guests` dengan anon key mengembalikan `[]` (lihat A4).
6. **Nama aneh:** uji nama dengan `&`, tanda kutip, huruf non-Latin, dan 60 karakter di cover.
7. **Mesin pencari:** pastikan halaman `/undangan/*` memiliki `noindex`.

## Checklist

- [ ] Tabel `guests`, RLS tanpa policy, fungsi `get_guest` dibuat
- [ ] Kolom `guest_id` dan `pax` ditambahkan ke `wishes`
- [ ] Query `guests` oleh anon key terbukti mengembalikan kosong
- [ ] `Invitation.tsx` dibuat, `page.tsx` dan `[slug]/page.tsx` memakainya
- [ ] `actions.ts` dan `WishForm.tsx` diperbarui
- [ ] `tamu.txt` disiapkan dan skrip dijalankan
- [ ] `link-tamu.tsv` dicek dan teks WhatsApp disiapkan
- [ ] `service_role` key tidak masuk repository atau Vercel
- [ ] Semua uji di Bagian D lolos
- [ ] Deploy ulang ke Vercel dan uji satu link tamu nyata

## Catatan

- Slug berisi nama dan 4 karakter acak (65 ribu kemungkinan per nama). Itu cukup untuk mencegah tebak-tebakan iseng, bukan pengaman tingkat tinggi. Siapa pun yang memegang link bisa membukanya. Kalau ingin lebih kuat, perpanjang bagian acak menjadi 8 karakter.
- Tidak ada pelacakan "sudah dibuka". Bila diperlukan nanti, tambahkan kolom `opened_at` dan fungsi `mark_opened(slug)` dengan pola `security definer` yang sama.
- Kalau ada tamu dengan nama sama, bagian acak pada slug membuatnya tetap unik.
- Kode memakai Next.js 15 ke atas dan React 19. Pada Next 14, `params` dan `searchParams` bukan Promise dan `useActionState` diganti `useFormState` dari `react-dom`.
- Kode belum dijalankan di project nyata; uji lokal dulu sebelum deploy.

## Tahap berikutnya

- Halaman admin untuk melihat daftar tamu, ucapan, dan rekap kehadiran (butuh autentikasi, jangan buka untuk publik).
- Penanda "sudah dibuka" dan rekap RSVP per kelompok.
- Rate limit per IP untuk form ucapan.
