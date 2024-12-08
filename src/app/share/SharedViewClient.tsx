"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "../../styles/animations.css";
import { Message } from "../types";
import Header from "../components/Header";
import MessageList from "../components/MessageList";
import {
  handleSharedRequest,
  handleContinueRequest,
} from "@/lib/actions/api-handler";

// ConversationLoader component to handle URL params and conversation loading
function ConversationLoader({
  onConversationLoad,
}: {
  onConversationLoad: (messages: Message[]) => void;
}) {
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      fetchSharedConversation(id).then(messages => {
        if (messages) {
          onConversationLoad(messages);
        }
      });
    }
  }, [searchParams, onConversationLoad]);

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
  } catch {
    console.error("Error fetching shared conversation:");
    return null;
  }
}

export default function SharedViewClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleContinueConversation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await handleContinueRequest(messages);

      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      if (!response.ok) {
        throw new Error("Failed to create new conversation");
      }

      const data = response.data;
      if (!data) throw new Error("No data received");
      router.push(`/?id=${data.conversationId}`);
    } catch (error) {
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

  return (
    <div className="flex flex-col h-screen bg-[#343541]">
      <Header />
      <Suspense
        fallback={
          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 text-center text-gray-400">
            Loading shared conversation...
          </div>
        }
      >
        <ConversationLoader onConversationLoad={handleConversationLoad} />
      </Suspense>
      {error ? (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 text-center text-red-400">
          {error}
        </div>
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
