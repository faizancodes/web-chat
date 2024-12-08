"use client";

import { useSearchParams, usePathname } from "next/navigation";

interface ShareButtonProps {
  onShare: () => void;
}

export default function ShareButton({ onShare }: ShareButtonProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const conversationId = searchParams.get("id");

  // Hide share button if we're on the share page or if there's no conversation ID
  if (!conversationId || pathname.startsWith("/share")) return null;

  return (
    <button
      onClick={onShare}
      className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm"
    >
      <svg
        className="w-4 h-4 transform transition-transform duration-300 hover:rotate-12"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
      <span className="hidden sm:inline font-medium">Share</span>
    </button>
  );
}
