import { Suspense } from "react";
import ClientPage from "./components/ClientPage";

export const maxDuration = 60;

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen bg-[#343541]">
          <div className="sticky top-0 w-full backdrop-blur-md bg-[#2a2b38]/80 border-b border-gray-600/30 p-2 sm:p-4 shadow-lg z-50">
            <div className="max-w-3xl mx-auto px-2 sm:px-4">Loading...</div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}
