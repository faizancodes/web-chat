import { Suspense } from "react";
import ClientPage from "./components/ClientPage";
import Header from "./components/Header";

export const maxDuration = 60;

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen bg-[#343541]">
          <Header />
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
