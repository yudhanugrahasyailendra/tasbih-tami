"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ambilUcapan, kirimUcapan } from "../actions";
import { CONFIG, type Person } from "../_lib/config";
import { ago, fmtDate, fmtTime, gcal } from "../_lib/format";
import { GALLERY, PHOTOS, type PhotoKey } from "../_lib/photos";
import { ATTENDANCE_LABEL, ATTENDANCE_OPTIONS, type Wish } from "../_lib/wishes";


const { bride, groom, events } = CONFIG;
const MUSIC_LEVEL = 0.5;
const UNITS = ["Hari", "Jam", "Menit", "Detik"] as const;
function parts(ms: number) {
  const t = Math.floor(ms / 1000);
  return [Math.floor(t / 86400), Math.floor((t % 86400) / 3600), Math.floor((t % 3600) / 60), t % 60];
}
const NAV = [
  ["acara", "Acara"],
  ["lokasi", "Lokasi"],
  ["galeri", "Galeri"],
  ["hadiah", "Hadiah"],
  ["ucapan", "Ucapan"],
] as const;

function Fig({ k, priority }: { k: PhotoKey; priority?: boolean }) {
  const p = PHOTOS[k];
  return (
    <figure style={{ "--pos": p.pos } as CSSProperties}>
      <Image src={p.src} alt={p.alt} fill sizes="(min-width: 900px) 50vw, 100vw" priority={priority} />
    </figure>
  );
}

function PersonCard({ p, role }: { p: Person; role: "Putri" | "Putra" }) {
  return (
    <article className="person">
      <h3>{p.name}</h3>
      <p className="full">{p.full}</p>
      <p>
        {role} {p.parents}.
      </p>
    </article>
  );
}

function GiftRow({ title, number, note, copy }: { title: string; number?: string; note: string; copy: string }) {
  const [done, setDone] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(copy);
    } catch {
      const t = document.createElement("textarea");
      t.style.cssText = "position:fixed;opacity:0";
      t.value = copy;
      document.body.append(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }
  return (
    <div className="gift">
      <div>
        <p className="bank">{title}</p>
        {number && <p className="no">{number}</p>}
        <p className="an">{note}</p>
      </div>
      <button className="btn line" type="button" onClick={onCopy}>
        {done ? "Tersalin" : "Salin"}
      </button>
    </div>
  );
}

type Props = {
  /** Nama tamu untuk cover dan form. */
  guest?: string;
  /** Slug tamu terdaftar; server memverifikasinya lagi saat ucapan dikirim. */
  slug?: string;
  /** Batas jumlah hadir tamu terdaftar. Tanpa ini, pilihan jumlah tidak ditampilkan. */
  maxPax?: number;
};

export default function Invitation({ guest = "", slug, maxPax }: Props) {

  const [opened, setOpened] = useState(false);
  const [coverGone, setCoverGone] = useState(false);
  const [active, setActive] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState("");
  const [nama, setNama] = useState(guest);
  const [ucapan, setUcapan] = useState("");
  const [sending, setSending] = useState(false);
  const [cur, setCur] = useState(0);
  const [musicOk, setMusicOk] = useState(!!CONFIG.music);

  const h1Ref = useRef<HTMLHeadingElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);
  const lbRef = useRef<HTMLDialogElement>(null);
  const music = useRef({ want: false, raf: 0 });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const names = (
    <>
      {groom.name}
      <br />
      &amp; {bride.name}
    </>
  );

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  /* Kunci scroll selama cover tampil */
  useEffect(() => {
    document.body.classList.toggle("locked", !opened);
    document.body.classList.toggle("opened", opened);
    return () => document.body.classList.remove("locked", "opened");
  }, [opened]);

  useEffect(() => openRef.current?.focus({ preventScroll: true }), []);

  /* Animasi masuk per bagian (tema tirai). Dilewati jika pengguna memilih mengurangi gerakan. */
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.body.classList.add("anim");
    return () => document.body.classList.remove("anim");
  }, []);

  useEffect(() => {
    if (!opened) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          io.unobserve(el);
          // hero menunggu tirai cover selesai terbuka
          timers.push(setTimeout(() => el.classList.add("in"), el.id === "awal" ? 1400 : 0));
        }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );
    document.querySelectorAll("main > section, main > .rail").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [opened]);

  /* Hitung mundur tiap acara, diperbarui tiap detik */
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Menu aktif */
  useEffect(() => {
    const so = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    document.querySelectorAll("main > section[id]").forEach((s) => so.observe(s));
    return () => so.disconnect();
  }, []);

  /* Muat ucapan dari Supabase */
  useEffect(() => {
    ambilUcapan().then(setWishes).catch(() => {});
  }, []);

  /* Musik latar: mulai saat tombol cover ditekan (syarat browser), fade masuk dan keluar.
     iOS mengabaikan volume, jadi fade hanya terdengar di desktop dan Android. */
  function fadeTo(vol: number, ms: number, done?: () => void) {
    const a = bgmRef.current;
    if (!a) return;
    cancelAnimationFrame(music.current.raf);
    const from = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = ms ? Math.min(1, (now - t0) / ms) : 1;
      a.volume = Math.max(0, Math.min(1, from + (vol - from) * k));
      if (k < 1) music.current.raf = requestAnimationFrame(step);
      else done?.();
    };
    music.current.raf = requestAnimationFrame(step);
  }

  async function playMusic() {
    const a = bgmRef.current;
    if (!a || !musicOk) return;
    cancelAnimationFrame(music.current.raf);
    music.current.want = true;
    try {
      a.volume = 0;
      await a.play();
      fadeTo(MUSIC_LEVEL, 1800);
      setPlaying(true);
    } catch {
      music.current.want = false;
      setPlaying(false);
      showToast("Musik belum bisa diputar. Ketuk tombol Musik untuk mencoba lagi.");
    }
  }

  function pauseMusic() {
    music.current.want = false;
    setPlaying(false);
    fadeTo(0, 500, () => bgmRef.current?.pause());
  }

  function open() {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setOpened(true);
    window.scrollTo(0, 0);
    playMusic();
    setTimeout(() => {
      setCoverGone(true);
      h1Ref.current?.focus({ preventScroll: true });
    }, reduce ? 60 : 2400);
  }

  const showPhoto = (i: number) => setCur((i + GALLERY.length) % GALLERY.length);
  const photo = PHOTOS[GALLERY[cur]];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    setSending(true);
    try {
      const res = await kirimUcapan(new FormData(form));
      if (!res.ok) {
        showToast(res.error ?? "Ucapan gagal dikirim.");
        return;
      }
      setUcapan("");
      setWishes(await ambilUcapan());
      showToast("Ucapan terkirim. Terima kasih.");
    } catch {
      showToast("Ucapan gagal dikirim. Coba lagi sebentar.");
    } finally {
      setSending(false);
    }
  }

  const mapQuery = encodeURIComponent(CONFIG.map.query);

  return (
    <>
      {/* ========== COVER: tirai panggung ========== */}
      <div id="cover" className={opened ? "open" : undefined} role="dialog" aria-modal="true" aria-labelledby="cv-title" hidden={coverGone}>
        <div className="curtain l" aria-hidden="true" />
        <div className="curtain r" aria-hidden="true" />
        <div className="cover-text">
          <p className="small">Undangan pernikahan</p>
          <p className="names" id="cv-title">{names}</p>
          <p className="to">Kepada Yth.</p>
          <p className="guest">{guest || "Bapak/Ibu/Saudara/i"}</p>
          <button ref={openRef} className="btn" type="button" onClick={open}>
            Buka Undangan
          </button>
        </div>
      </div>

      <div id="page" inert={!opened}>
        <main>
          {/* Awal */}
          <section className="chapter hero t-dark" id="awal">
            <Fig k="celah" priority />
            <div className="body">
              <h1 ref={h1Ref} tabIndex={-1}>{names}</h1>
              <div className="schedule">
                {events.map((ev) => {
                  const left = now === null ? null : Math.max(0, new Date(ev.start).getTime() - now);
                  return (
                    <div className="event" key={`${ev.start}-${ev.name}`}>
                      <p className="info">
                        {ev.name}
                        <span>{fmtDate(ev.start)}</span>
                      </p>
                      <div className="count" role="timer" aria-label={`Menuju ${ev.name}`}>
                        {left === null ? null : left === 0 ? (
                          <p className="done">{ev.name} sudah berlangsung. Terima kasih atas doa Anda.</p>
                        ) : (
                          <ul>
                            {parts(left).map((v, i) => (
                              <li key={UNITS[i]}>
                                <b>{String(v).padStart(2, "0")}</b>
                                <span>{UNITS[i]}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="invite lead">Kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan mendoakan pernikahan kami.</p>
              <button
                className="vinyl"
                type="button"
                aria-pressed={playing}
                aria-label={playing ? "Jeda musik" : "Putar musik"}
                title={playing ? "Jeda musik" : "Putar musik"}
                hidden={!musicOk}
                onClick={() => (music.current.want ? pauseMusic() : playMusic())}
              >
                <svg className="disc" width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
                  <circle cx="32" cy="32" r="31" fill="#17110F" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="32" cy="32" r="25" fill="none" stroke="currentColor" strokeOpacity=".35" />
                  <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeOpacity=".35" />
                  <circle cx="32" cy="32" r="15" fill="none" stroke="currentColor" strokeOpacity=".35" />
                  <path d="M10 22a24 24 0 0 1 12-12M54 42a24 24 0 0 1-12 12" fill="none" stroke="currentColor" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="32" cy="32" r="10" fill="#B8A062" />
                  <circle cx="32" cy="32" r="2" fill="#17110F" />
                </svg>
                <svg className="state" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                  {playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4.5v15l13-7.5z" />}
                </svg>
              </button>
            </div>
          </section>

          {/* Pembuka */}
          <section className="chapter flip t-dark" id="pembuka">
            <Fig k="profilbw" />
            <div className="body">
              <h2>Assalamu&apos;alaikum</h2>
              <p className="lead">
                Dengan memohon rahmat dan ridha Allah SWT, kami akan melangsungkan pernikahan. Kehadiran dan doa Anda adalah kebahagiaan bagi kedua keluarga kami.
              </p>
              <blockquote className="verse">
                “Di antara tanda-tanda kekuasaan-Nya, Dia menciptakan pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.”
                <cite>QS. Ar-Rum: 21</cite>
              </blockquote>
            </div>
          </section>

          {/* Mempelai */}
          <section className="chapter t-red" id="mempelai">
            <Fig k="rak" />
            <div className="body">
              <h2>Kedua mempelai</h2>
              <div>
                <PersonCard p={groom} role="Putra" />
                <PersonCard p={bride} role="Putri" />
              </div>
            </div>
          </section>

          <div className="rail t-light" aria-hidden="true" />

          {/* Jadwal */}
          <section className="chapter flip t-light" id="acara">
            <Fig k="lorong" />
            <div className="body">
              <h2>Jadwal acara</h2>
              <p className="lead">Simpan setiap acara ke kalender agar tidak terlewat.</p>
              <ol className="timeline">
                {events.map((ev) => (
                  <li key={`${ev.start}-${ev.name}`}>
                    <h3>{ev.name}</h3>
                    <p className="when">
                      {fmtDate(ev.start)}, pukul {fmtTime(ev.start)}
                      {ev.end ? "–" + fmtTime(ev.end) : ""} WITA
                    </p>
                    <p>{ev.what}</p>
                    <p className="where">
                      <b>{ev.venue}</b>
                      <br />
                      {ev.address}
                    </p>
                    <a
                      className="btn line"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={
                        "https://calendar.google.com/calendar/render?action=TEMPLATE" +
                        "&text=" + encodeURIComponent(`${ev.name}: ${bride.name} & ${groom.name}`) +
                        "&dates=" + gcal(ev.start) + "/" + gcal(ev.end ?? ev.start) +
                        "&location=" + encodeURIComponent(`${ev.venue}, ${ev.address}`)
                      }
                    >
                      Tambahkan ke kalender
                    </a>
                  </li>
                ))}
              </ol>
              {/* {CONFIG.dresscode && <p className="dress">Busana yang kami sarankan: {CONFIG.dresscode}.</p>} */}
            </div>
          </section>

          {/* Lokasi */}
          <section className="chapter t-red" id="lokasi">
            <Fig k="tangga1" />
            <div className="body">
              <h2>Lokasi resepsi</h2>
              <p>
                <b>{CONFIG.map.venue}</b>
                <br />
                {CONFIG.map.address}
              </p>
              <div className="map">
                <iframe
                  title="Peta lokasi resepsi"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                />
              </div>
              <a className="btn line" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}>
                Buka di Google Maps
              </a>
            </div>
          </section>

          {/* Galeri */}
          <section className="gallery-sec t-dark" id="galeri">
            <div className="head">
              <h2>Foto prewedding</h2>
              <p className="lead">Ketuk foto untuk memperbesar.</p>
            </div>
            <div className="masonry">
              {GALLERY.map((key, i) => {
                const p = PHOTOS[key];
                return (
                  <button
                    key={key}
                    className="tile"
                    style={{ "--t": i % 6 } as CSSProperties}
                    type="button"
                    aria-label={`Perbesar foto ${i + 1}: ${p.alt}`}
                    onClick={() => {
                      showPhoto(i);
                      lbRef.current?.showModal();
                    }}
                  >
                    <Image src={p.src} alt={p.alt} width={p.w} height={p.h} sizes="(min-width: 900px) 33vw, 50vw" />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Hadiah */}
          <section className="hadiah t-ochre" id="hadiah">
            <div className="wrap">
              <div>
                <h2>Tanda kasih</h2>
                <p className="lead">Doa Anda sudah cukup bagi kami. Jika ingin berbagi kebahagiaan, tersedia rekening dan alamat berikut.</p>
              </div>
              <div>
                {CONFIG.gifts.map((g) => (
                  <GiftRow key={g.number} title={g.bank} number={g.number} note={`a.n. ${g.holder}`} copy={g.number} />
                ))}
                {/* <GiftRow
                  title="Kirim hadiah ke alamat"
                  note={`${CONFIG.giftAddress.to}, ${CONFIG.giftAddress.address}`}
                  copy={`${CONFIG.giftAddress.to}, ${CONFIG.giftAddress.address}`}
                /> */}
              </div>
            </div>
          </section>

          <div className="rail t-light" aria-hidden="true" />

          {/* Konfirmasi dan ucapan */}
          <section className="chapter flip t-light" id="ucapan">
            <Fig k="intip" />
            <div className="body">
              <h2>Konfirmasi dan ucapan</h2>
              <p className="lead">Beri tahu kami apakah Anda hadir, lalu tuliskan doa untuk kedua mempelai.</p>
              <form onSubmit={submit}>
                <div>
                  <label htmlFor="f-nama">Nama</label>
                  <input id="f-nama" name="name" type="text" maxLength={60} required autoComplete="name" value={nama} onChange={(e) => setNama(e.target.value)} />
                </div>
                <fieldset>
                  <legend>Kehadiran</legend>
                  <div className="opts">
                    {ATTENDANCE_OPTIONS.map((o, i) => (
                      <label key={o.value}>
                        <input type="radio" name="attendance" value={o.value} defaultChecked={i === 0} />
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {maxPax ? (
                  <div>
                    <label htmlFor="f-jml">Jumlah tamu yang hadir</label>
                    <select id="f-jml" name="pax" defaultValue="1">
                      {Array.from({ length: maxPax }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} orang
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div>
                  <label htmlFor="f-ucapan">Ucapan dan doa</label>
                  <textarea id="f-ucapan" name="message" maxLength={500} required value={ucapan} onChange={(e) => setUcapan(e.target.value)} />
                </div>
                {slug && <input type="hidden" name="slug" value={slug} />}
                {/* honeypot: disembunyikan dari manusia */}
                <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
                <button className="btn" type="submit" disabled={sending}>{sending ? "Mengirim..." : "Kirim ucapan"}</button>
              </form>
              <h3 className="wishes-h">{wishes.length ? `Ucapan dari tamu (${wishes.length})` : "Ucapan dari tamu"}</h3>
              <div className="wishes">
                {wishes.length ? (
                  wishes.map((w) => (
                    <div className="wish" key={w.id}>
                      <b>{w.name}</b>
                      <small>
                        {w.attendance ? ATTENDANCE_LABEL[w.attendance] : ""}
                        {w.attendance === "hadir" && w.pax ? ` (${w.pax} orang)` : ""}
                        {w.attendance ? " · " : ""}
                        {ago(Date.parse(w.created_at))}
                      </small>
                      <p>{w.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="empty">Belum ada ucapan. Tulis yang pertama lewat formulir di atas.</p>
                )}
              </div>
            </div>
          </section>

          {/* Penutup */}
          <section className="chapter closing t-red" id="penutup">
            <Fig k="sofa2" />
            <div className="body">
              <h2>Terima kasih</h2>
              <p className="lead">Atas doa dan kehadiran Anda, kami ucapkan terima kasih. Wassalamu&apos;alaikum warahmatullahi wabarakatuh.</p>
              <p className="names">{groom.name} &amp; {bride.name}</p>
              {CONFIG.photoCredit && <p className="meta">{CONFIG.photoCredit}</p>}
              <aside className="made-by" aria-label="Pembuat undangan">
                <p className="label">Created By:</p>
                <Image className="logo" src={CONFIG.developer.logo} alt={CONFIG.developer.name} width={1324} height={468} sizes="160px" style={{ height: 48, width: "auto" }} />
                <p className="ask">Ingin undangan digital seperti ini?</p>
                <a
                  className="btn line wa"
                  href={`https://wa.me/${CONFIG.developer.whatsapp}?text=${encodeURIComponent("Halo, saya ingin membuat undangan digital.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Hubungi ${CONFIG.developer.contactName} lewat WhatsApp, ${CONFIG.developer.whatsappLabel}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm0 1.9a8.1 8.1 0 1 1-4.3 15l-.3-.2-2.9.8.8-2.8-.2-.3A8.1 8.1 0 0 1 12 3.9Zm-3 3.7c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.2 2.4.9 2.9.7 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.7-.4l-1.9-.9c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.700-1.600-2-.2-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.200c-.2-.5-.4-.5-.6-.5H9Z"
                    />
                  </svg>
                  <span>
                    {CONFIG.developer.contactName} · {CONFIG.developer.whatsappLabel}
                  </span>
                </a>
              </aside>
            </div>
          </section>
        </main>
      </div>

      <nav className="bar" aria-label="Menu undangan" inert={!opened}>
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className={active === id ? "on" : undefined}>
            {label}
          </a>
        ))}
      </nav>

      <dialog
        id="lb"
        ref={lbRef}
        aria-label="Galeri foto"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") showPhoto(cur + 1);
          if (e.key === "ArrowLeft") showPhoto(cur - 1);
        }}
      >
        <div className="lb-in" onClick={(e) => e.target === e.currentTarget && lbRef.current?.close()}>
          <button className="btn line lb-close" type="button" onClick={() => lbRef.current?.close()}>
            Tutup
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} alt={photo.alt} />
          <div className="lb-bar">
            <button className="btn line" type="button" onClick={() => showPhoto(cur - 1)}>Sebelumnya</button>
            <span aria-live="polite">{cur + 1} dari {GALLERY.length}</span>
            <button className="btn line" type="button" onClick={() => showPhoto(cur + 1)}>Berikutnya</button>
          </div>
        </div>
      </dialog>

      {musicOk && (
        <audio
          ref={bgmRef}
          src={CONFIG.music}
          loop
          preload="none"
          onError={() => {
            if (music.current.want) showToast("Musik tidak dapat dimuat.");
            music.current.want = false;
            setMusicOk(false);
            setPlaying(false);
          }}
        />
      )}
      <div className={"toast" + (toast ? " show" : "")} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
