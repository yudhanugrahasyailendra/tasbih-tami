"use client";

import { useSearchParams } from "next/navigation";
import Invitation from "./Invitation";

/** Cadangan untuk tamu dadakan di luar daftar: /?to=Nama */
export default function InvitationFromQuery() {
  const to = useSearchParams().get("to")?.slice(0, 60) ?? "";
  return <Invitation guest={to} />;
}
