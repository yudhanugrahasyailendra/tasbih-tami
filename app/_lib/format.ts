const TZ = "Asia/Makassar";

export const fmtDate = (d: string | number) =>
  new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(d));

export const fmtTime = (d: string | number) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(new Date(d));

export const gcal = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");

export function ago(ts: number) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "baru saja";
  if (s < 3600) return Math.floor(s / 60) + " menit lalu";
  if (s < 86400) return Math.floor(s / 3600) + " jam lalu";
  return Math.floor(s / 86400) + " hari lalu";
}
