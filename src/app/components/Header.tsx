import Logo from "../../../public/logo.png";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import ShareModal from "./ShareModal";

// ShareButton component that uses useSearchParams
function ShareButton({ onShare }: { onShare: () => void }) {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("id");

  if (!conversationId) return null;

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

// ShareUrlManager component to handle share URL logic
function ShareUrlManager({
  onShareUrlChange,
}: {
  onShareUrlChange: (url: string) => void;
}) {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    if (id) {
      onShareUrlChange(
        `${window.location.origin}${window.location.pathname}?id=${id}`
      );
    }
  }, [id, onShareUrlChange]);

  return null;
}

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const handleShare = async () => {
    setIsModalOpen(true);
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
