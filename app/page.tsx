import { Suspense } from "react";
import Invitation from "./_components/Invitation";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Invitation />
    </Suspense>
  );
}
