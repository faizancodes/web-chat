"use client";

import Logo from "../../../public/logo.png";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import ShareModal from "./ShareModal";
import ShareButton from "./ShareButton";
import { handleShareRequest } from "../api/actions/api-handler";

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
}: {
  onNewConversation?: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const searchParams = useSearchParams();

  const handleShare = async () => {
    const conversationId = searchParams.get("id");
    if (!conversationId) return;

    try {
      const response = await handleShareRequest(conversationId);

      if (!response.ok) {
        throw new Error("Failed to create shared conversation");
      }

      if (!response.data) throw new Error("No data received");

      const { sharedId } = response.data;
      if (typeof window !== "undefined") {
        setShareUrl(`${window.location.origin}/share?id=${sharedId}`);
      }
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error sharing conversation:", error);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-[#2a2b38] via-[#343541] to-[#2a2b38] border-b border-gray-600 p-4 shadow-lg">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center transform hover:rotate-12 transition-transform duration-300">
            <Image src={Logo} alt="Logo" width={100} height={100} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide hover:text-blue-400 transition-colors duration-300">
              WebChat
            </h1>
            <p className="text-sm text-gray-400">
              Made with ❤️ by{"  "}
              <a
                href="https://www.linkedin.com/in/faizancodes/"
                className="text-blue-400 hover:text-blue-500 transition-colors duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Faizan
              </a>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="flex items-center space-x-1.5 bg-gray-300 hover:bg-gray-300 text-black px-3 py-1.5 rounded-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-sm"
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
            <ShareButton onShare={handleShare} />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={null}>
        <ShareUrlManager onShareUrlChange={setShareUrl} />
      </Suspense>
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
}: {
  onNewConversation?: () => void;
} = {}) {
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
      <HeaderContent onNewConversation={onNewConversation} />
    </Suspense>
  );
}
