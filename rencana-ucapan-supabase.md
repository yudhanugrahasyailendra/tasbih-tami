# Rencana: Fitur Ucapan Undangan (Next.js + Supabase)

Tujuan: tamu bisa mengirim ucapan dan doa dari halaman undangan, datanya tersimpan di Supabase (PostgreSQL), dan nama tamu tampil di undangan lewat `?to=Nama+Tamu`.

Cakupan saat ini: hanya data ucapan. Tabel `guests` (daftar tamu terdaftar dengan slug) menyusul nanti.

## Ringkasan

| Bagian | Pilihan |
| --- | --- |
| Framework | Next.js (App Router, versi 15 ke atas) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Validasi | zod (di server) |
| Anti spam | honeypot, batas panjang di database, rate limit (opsional) |
| Nama tamu | parameter `?to=` |

## Bagian A. Setup Supabase

### A1. Buat project
1. Buka supabase.com, klik **New project**.
2. Pilih region terdekat (Singapore), isi nama project dan database password, lalu tunggu sampai selesai.
3. Simpan database password.

### A2. Buat tabel `wishes`
Jalankan di **SQL Editor**:

```sql
create table wishes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  message text not null check (char_length(message) between 1 and 500),
  attendance text check (attendance in ('hadir','tidak','ragu')),
  created_at timestamptz default now()
);
```

Batas panjang dipasang di database supaya tetap aman walau validasi di aplikasi terlewati.

### A3. Aktifkan Row Level Security
```sql
alter table wishes enable row level security;

create policy "baca ucapan" on wishes for select using (true);
create policy "kirim ucapan" on wishes for insert with check (true);
```

Tidak ada policy update dan delete, jadi keduanya otomatis ditolak untuk publik. Moderasi (hapus ucapan) dilakukan lewat **Table Editor** di dashboard.

### A4. Ambil kredensial
**Project Settings > API**: salin **Project URL** dan **anon public key**.
Jangan pernah memakai `service_role` key di frontend atau di env berawalan `NEXT_PUBLIC`.

## Bagian B. Implementasi di Next.js

### B1. Paket dan environment
```bash
npm i @supabase/supabase-js zod
```

`.env.local` (pastikan masuk `.gitignore`):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Restart `npm run dev` setelah mengubah env.

### B2. Struktur file
```
src/
  lib/supabase.ts
  app/
    page.tsx
    actions.ts
  components/
    WishForm.tsx
    WishList.tsx
public/
  audio/musik.mp3
```

### B3. `src/lib/supabase.ts`
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### B4. `src/app/actions.ts` (Server Action)
```ts
'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(500),
  attendance: z.enum(['hadir', 'tidak', 'ragu']).optional(),
})

export type FormState = { ok: boolean; error?: string }

export async function kirimUcapan(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  // honeypot: bot mengisi field tersembunyi ini
  if (formData.get('website')) return { ok: true }

  const parsed = schema.safeParse({
    name: formData.get('name'),
    message: formData.get('message'),
    attendance: formData.get('attendance') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: 'Nama dan ucapan wajib diisi (ucapan maksimal 500 karakter).' }
  }

  const { error } = await supabase.from('wishes').insert(parsed.data)
  if (error) return { ok: false, error: 'Ucapan gagal dikirim. Coba lagi sebentar.' }

  revalidatePath('/')
  return { ok: true }
}
```

### B5. `src/components/WishList.tsx` (server component)
```tsx
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function WishList() {
  const { data } = await supabase
    .from('wishes')
    .select('id, name, message, attendance, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!data?.length) return <p>Belum ada ucapan. Jadilah yang pertama.</p>

  return (
    <ul>
      {data.map((w) => (
        <li key={w.id}>
          <strong>{w.name}</strong>
          <p>{w.message}</p>
        </li>
      ))}
    </ul>
  )
}
```

Semua isi ditampilkan sebagai teks biasa (jangan pakai `dangerouslySetInnerHTML`) supaya aman dari XSS. Sesuaikan markup dan gaya dengan desain undangan.

### B6. `src/components/WishForm.tsx` (client component)
```tsx
'use client'
import { useActionState } from 'react'
import { kirimUcapan, type FormState } from '@/app/actions'

export default function WishForm({ defaultName = '' }: { defaultName?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    kirimUcapan,
    { ok: false }
  )

  return (
    <form action={action}>
      <input name="name" defaultValue={defaultName} maxLength={60} required placeholder="Nama" />
      <textarea name="message" maxLength={500} required placeholder="Ucapan dan doa" />
      <select name="attendance" defaultValue="">
        <option value="">Konfirmasi kehadiran</option>
        <option value="hadir">Hadir</option>
        <option value="tidak">Tidak hadir</option>
        <option value="ragu">Belum pasti</option>
      </select>
      {/* honeypot: disembunyikan dari manusia */}
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

### B7. `src/app/page.tsx`
```tsx
import WishForm from '@/components/WishForm'
import WishList from '@/components/WishList'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>
}) {
  const { to } = await searchParams
  const tamu = to?.slice(0, 60)

  return (
    <main>
      {/* ...cover dan bagian undangan lain... */}
      <p>Kepada Yth. {tamu ?? 'Bapak/Ibu/Saudara/i'}</p>
      <WishForm defaultName={tamu} />
      <WishList />
    </main>
  )
}
```

Contoh link untuk tamu: `https://domain-anda.vercel.app/?to=Budi+Santoso`

### B8. Musik latar
1. Salin `audio/musik.mp3` dari template HTML ke `public/audio/musik.mp3`.
2. Buat komponen `'use client'` untuk player: `<audio src="/audio/musik.mp3" loop preload="none">`.
3. Panggil `play()` hanya dari klik tombol (Buka undangan atau Musik), karena browser memblokir suara otomatis.
4. Pindahkan logika dari template HTML: fade volume, jeda saat tab disembunyikan, tombol "Buka tanpa musik", dan penanganan error file.

## Bagian C. Uji dan deploy

### C1. Uji lokal
1. `npm run dev`
2. Buka `/?to=Budi+Santoso` dan pastikan nama muncul di cover dan terisi di form.
3. Kirim satu ucapan.
4. Cek barisnya di **Table Editor** Supabase dan pastikan tampil di daftar ucapan.
5. Uji input tidak valid: nama kosong, pesan lebih dari 500 karakter, isi field honeypot.

### C2. Deploy ke Vercel
1. Push ke Git, lalu impor project di Vercel.
2. **Settings > Environment Variables**: tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Redeploy.
4. Dari URL produksi, kirim satu ucapan untuk memastikan koneksi berjalan.

## Checklist

- [ ] Project Supabase dibuat
- [ ] Tabel `wishes` dibuat
- [ ] RLS dan policy (select, insert) aktif
- [ ] URL dan anon key disimpan di `.env.local`
- [ ] Paket `@supabase/supabase-js` dan `zod` terpasang
- [ ] `lib/supabase.ts`, `actions.ts`, `WishForm.tsx`, `WishList.tsx` dibuat
- [ ] `page.tsx` membaca `?to=` dan memasang form serta daftar
- [ ] Musik dipindahkan ke komponen client
- [ ] Uji lokal lolos
- [ ] Env diisi di Vercel dan deploy berhasil
- [ ] Uji kirim ucapan dari URL produksi

## Catatan

- Kode di atas memakai Next.js 15 ke atas dan React 19. Pada Next 14, `searchParams` bukan Promise dan `useActionState` diganti `useFormState` dari `react-dom`.
- Alias `@/` tersedia kalau project dibuat dengan `create-next-app` dan opsi alias import diaktifkan.
- Kalau form tidak memakai pilihan kehadiran, hapus `attendance` di `schema`, di `<select>`, dan di tabel.
- Form publik rawan spam. Tahap lanjutan yang disarankan: rate limit per IP (misalnya Upstash Ratelimit), pagination atau tombol "muat lagi", dan moderasi lewat halaman admin.

## Tahap berikutnya (menyusul)

- Tabel `guests` dengan `slug` unik, sehingga link menjadi `/undangan/budi-santoso` dan nama tidak bisa dipalsukan.
- Batas jumlah tamu (`max_pax`) per undangan.
- Generator link massal untuk dikirim lewat WhatsApp.
- Halaman admin untuk melihat dan menghapus ucapan.
