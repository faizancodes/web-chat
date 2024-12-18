"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "../../styles/animations.css";
import { Message } from "../../app/types";
import Header from "../../app/components/Header";
import MessageList from "../../app/components/MessageList";
import {
  handleSharedRequest,
  handleContinueRequest,
} from "../../app/api/actions/api-handler";
import SharedViewSkeleton from "./SharedViewSkeleton";

// ConversationLoader component to handle URL params and conversation loading
function ConversationLoader({
  onConversationLoad,
  onLoadingChange,
}: {
  onConversationLoad: (messages: Message[]) => void;
  onLoadingChange: (loading: boolean) => void;
}) {
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      onLoadingChange(true);
      fetchSharedConversation(id).then(messages => {
        if (messages) {
          onConversationLoad(messages);
        }
        onLoadingChange(false);
      });
    }
  }, [searchParams, onConversationLoad, onLoadingChange]);

  return null;
}

async function fetchSharedConversation(id: string): Promise<Message[] | null> {
  try {
    const response = await handleSharedRequest(id);
    if (response.ok) {
      const data = response.data;
      if (!data) throw new Error("No data received");
      return data.messages;
    } else if (response.status !== 404) {
      console.error("Error fetching shared conversation");
    }
    return null;
  } catch (error) {
    console.error("Error fetching shared conversation:", error);
    return null;
  }
}

export default function SharedViewClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);
  const router = useRouter();

  // Initialize session
  React.useEffect(() => {
    const initSession = async () => {
      console.log("Starting session initialization...");
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        console.log("Session response status:", response.status);
        
        if (!response.ok) {
          throw new Error("Failed to initialize session");
        }
        
        const data = await response.json();
        console.log("Session initialized:", data);
        setIsSessionInitialized(true);
      } catch (error) {
        console.error("Error initializing session:", error);
        setError("Failed to initialize session. Please try again.");
      }
    };

    initSession();
  }, []);

  const handleContinueConversation = async () => {
    if (!isSessionInitialized) {
      setError("Please wait while we initialize your session...");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Make direct fetch request instead of using handler
      const response = await fetch("/api/continue", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      console.log("Continue response status:", response.status);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Continue error response:", errorData);
        throw new Error("Failed to create new conversation");
      }

      const data = await response.json();
      console.log("Continue response data:", data);
      
      if (!data) throw new Error("No data received");
      router.push(`/?id=${data.conversationId}`);
    } catch (error) {
      console.error("Continue error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to continue conversation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationLoad = React.useCallback(
    (loadedMessages: Message[]) => {
      setMessages(loadedMessages);
    },
    []
  );

  const handleLoadingChange = React.useCallback((loading: boolean) => {
    setIsInitialLoading(loading);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#343541]">
      <Header isSidebarOpen={false} onToggleSidebar={() => {}} />
      <ConversationLoader
        onConversationLoad={handleConversationLoad}
        onLoadingChange={handleLoadingChange}
      />
      {error ? (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 text-center text-red-400">
          {error}
        </div>
      ) : isInitialLoading ? (
        <SharedViewSkeleton />
      ) : messages.length > 0 ? (
        <MessageList messages={messages} isLoading={false} />
      ) : null}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 text-center">
        <button
          onClick={handleContinueConversation}
          disabled={isLoading || messages.length === 0}
          className={`bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-blue-500 mb-4 flex items-center justify-center space-x-2 w-full sm:w-auto mx-auto ${
            isLoading ? "cursor-wait" : ""
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Creating New Conversation...</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>Continue This Conversation</span>
            </>
          )}
        </button>
        <div className="text-gray-400">
          This is a read-only view. Click the button above to start a new
          conversation with these messages.
        </div>
      </div>
    </div>
  );
}
