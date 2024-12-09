import React, { Suspense } from "react";
import SharedViewClient from "./SharedViewClient";

export const maxDuration = 30;

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen bg-[#343541]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 text-center text-gray-400">
            Loading shared conversation...
          </div>
        </div>
      }
    >
      <SharedViewClient />
    </Suspense>
  );
}
