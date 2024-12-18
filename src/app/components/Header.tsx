"use client";

import Logo from "../../../public/logo.png";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import ShareModal from "./ShareModal";
import ShareButton from "./ShareButton";
import { shareConversation } from "../api/services/conversation";

// ShareUrlManager component to handle share URL logic
function ShareUrlManager({
  onShareUrlChange,
}: {
  onShareUrlChange: (url: string) => void;
}) {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    if (id && typeof window !== "undefined") {
      onShareUrlChange(`${window.location.origin}/share?id=${id}`);
    }
  }, [id, onShareUrlChange]);

  return null;
}

// Create a wrapped header content component
function HeaderContent({
  onNewConversation,
  isSidebarOpen,
  onToggleSidebar,
}: {
  onNewConversation?: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleShare = async (sharedId: string) => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/share?id=${sharedId}`);
      setIsModalOpen(true);
    }
  };

  const handleError = (error: string) => {
    setError(error);
    setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
  };

  return (
    <div className="sticky top-0 w-full backdrop-blur-md bg-[#2a2b38]/80 border-b border-gray-600/30 p-2 sm:p-4 shadow-lg z-50">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-2 sm:px-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={onToggleSidebar}
            className="hidden sm:block lg:hidden -ml-1 p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isSidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl backdrop-blur-sm bg-white/10 flex items-center justify-center transform hover:scale-110 hover:rotate-6 transition-all duration-300 shadow-lg border border-white/10">
            <Image
              src={Logo}
              alt="Logo"
              width={100}
              height={100}
              className="w-6 h-6 sm:w-8 sm:h-8"
            />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white tracking-wide hover:text-blue-400 transition-colors duration-300 text-shadow">
              WebChat
            </h1>
            <p className="text-xs sm:text-sm text-gray-300/90 font-light">
              Made with ❤️ by{" "}
              <a
                href="https://www.linkedin.com/in/faizancodes/"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-300 font-normal"
                target="_blank"
                rel="noopener noreferrer"
              >
                Faizan
              </a>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="flex items-center space-x-1 sm:space-x-2 backdrop-blur-sm bg-white/10 hover:bg-white/20 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm border border-white/10"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden sm:inline font-medium">New Chat</span>
            </button>
          )}
          <Suspense fallback={null}>
            <ShareButton onShared={handleShare} onError={handleError} />
          </Suspense>
        </div>
      </div>
      {error && (
        <div className="max-w-3xl mx-auto mt-2 px-4">
          <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded text-sm">
            {error}
          </div>
        </div>
      )}
      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
}

// Export the wrapped component
export default function Header({
  onNewConversation,
  isSidebarOpen,
  onToggleSidebar,
}: {
  onNewConversation?: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <Suspense
      fallback={
        <div className="w-full bg-gradient-to-r from-[#2a2b38] via-[#343541] to-[#2a2b38] border-b border-gray-600 p-4 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
            Loading...
          </div>
        </div>
      }
    >
      <HeaderContent
        onNewConversation={onNewConversation}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />
    </Suspense>
  );
}
