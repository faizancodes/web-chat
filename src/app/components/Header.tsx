"use client";

import Logo from "../../../public/logo.png";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import ShareModal from "./ShareModal";
import ShareButton from "./ShareButton";

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
function HeaderContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const searchParams = useSearchParams();

  const handleShare = async () => {
    const conversationId = searchParams.get("id");
    if (!conversationId) return;

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create shared conversation");
      }

      const { sharedId } = await response.json();
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
        <Suspense fallback={null}>
          <ShareButton onShare={handleShare} />
        </Suspense>
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
export default function Header() {
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
      <HeaderContent />
    </Suspense>
  );
}
