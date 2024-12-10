"use client";

import { ChatThread } from "../types";
import Link from "next/link";

interface ChatSidebarProps {
  currentChatId?: string | null;
  threads: ChatThread[];
}

export default function ChatSidebar({
  currentChatId,
  threads,
}: ChatSidebarProps) {
  return (
    <div className="w-64 h-screen bg-[#202123] text-gray-200 p-2 overflow-y-auto flex flex-col">
      <Link
        href="/"
        className="w-full mb-4 p-3 rounded hover:bg-gray-700 flex items-center gap-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        New Chat
      </Link>

      <div className="space-y-2 flex-1">
        {threads.map(thread => (
          <Link
            key={thread.id}
            href={`/?id=${thread.id}`}
            className={`block p-3 rounded hover:bg-gray-700 ${
              currentChatId === thread.id ? "bg-gray-700" : ""
            }`}
          >
            <div className="text-sm font-medium truncate">{thread.title}</div>
            <div className="text-xs text-gray-400 truncate">
              {thread.lastMessage}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(thread.timestamp).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
