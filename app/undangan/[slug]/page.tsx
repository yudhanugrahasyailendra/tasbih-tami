import type { Metadata } from "next";
import { Suspense } from "react";
import Invitation from "../../_components/Invitation";
import { getGuest } from "../../_lib/guests";

// halaman tamu tidak boleh masuk hasil pencarian
export const metadata: Metadata = { robots: { index: false, follow: false } };

async function GuestInvitation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guest = await getGuest(slug);

  // slug tidak dikenal: tetap tampil, dengan sapaan umum
  return <Invitation guest={guest?.name} slug={guest ? slug : undefined} maxPax={guest?.max_pax} />;
}

export default function Page({ params }: PageProps<"/undangan/[slug]">) {
  return (
    <Suspense fallback={null}>
      <GuestInvitation params={params} />
    </Suspense>
  );
}
