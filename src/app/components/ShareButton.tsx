"use client";

import { useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { shareConversation } from "../api/services/conversation";

interface ShareButtonProps {
  onShare?: () => void;
  onShared?: (sharedId: string) => void;
  onError?: (error: string) => void;
}

export default function ShareButton({ onShare, onShared, onError }: ShareButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const conversationId = searchParams.get("id");

  // Hide share button if we're on the share page or if there's no conversation ID
  if (!conversationId || pathname.startsWith("/share")) return null;

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    setIsLoading(true);
    try {
      const sharedId = await shareConversation(conversationId);
      onShared?.(sharedId);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Failed to share conversation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isLoading}
      className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
    >
      {isLoading ? (
        <svg
          className="w-4 h-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
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
      )}
      <span className="hidden sm:inline font-medium">
        {isLoading ? "Sharing..." : "Share"}
      </span>
    </button>
  );
}
