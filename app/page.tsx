import { Suspense } from "react";
import InvitationFromQuery from "./_components/InvitationFromQuery";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <InvitationFromQuery />
    </Suspense>
  );
}
