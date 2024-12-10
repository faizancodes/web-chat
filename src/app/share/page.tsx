import React, { Suspense } from "react";
import SharedViewClient from "./SharedViewClient";
import SharedViewSkeleton from "./SharedViewSkeleton";

export const maxDuration = 60;

export default function SharePage() {
  return (
    <Suspense fallback={<SharedViewSkeleton />}>
      <SharedViewClient />
    </Suspense>
  );
}
