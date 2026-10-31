export type Attendance = "hadir" | "tidak" | "ragu";

export type Wish = {
  id: string;
  name: string;
  message: string;
  attendance: Attendance | null;
  pax: number | null;
  created_at: string;
};

export const ATTENDANCE_OPTIONS: { value: Attendance; label: string }[] = [
  { value: "hadir", label: "Hadir" },
  { value: "tidak", label: "Tidak hadir" },
  { value: "ragu", label: "Belum pasti" },
];

export const ATTENDANCE_LABEL: Record<Attendance, string> = {
  hadir: "Hadir",
  tidak: "Tidak hadir",
  ragu: "Belum pasti",
};

export type SendResult = { ok: boolean; error?: string };
