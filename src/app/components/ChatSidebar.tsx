"use client";

import { ChatThread } from "../types";
import Link from "next/link";

interface ChatSidebarProps {
  currentChatId?: string | null;
  threads: ChatThread[];
  onDeleteThread: (threadId: string) => void;
}

export default function ChatSidebar({
  currentChatId,
  threads,
  onDeleteThread,
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
          <div key={thread.id} className="group relative">
            <Link
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
            <button
              onClick={e => {
                e.preventDefault();
                if (
                  confirm("Are you sure you want to delete this conversation?")
                ) {
                  onDeleteThread(thread.id);
                }
              }}
              className="absolute right-2 top-2 p-1.5 rounded-full bg-gray-700 opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
