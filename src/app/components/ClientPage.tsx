"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import "../../styles/animations.css";
import { Message, ChatThread } from "../types";
import Header from "./Header";
import MessageList from "./MessageList";
import InputArea from "./InputArea";
import RateLimitBanner from "./RateLimitBanner";
import ErrorBanner from "./ErrorBanner";
import { fetchConversation } from "../api/services/conversation";
import { useMessageHandler } from "../hooks/useMessageHandler";
import ChatSidebar from "./ChatSidebar";

// Component for handling search params
function ConversationLoader({
  onConversationLoad,
  currentChatId,
  onError,
}: {
  onConversationLoad: (messages: Message[], id: string | null) => void;
  currentChatId: string | null;
  onError: (error: string) => void;
}) {
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const id = searchParams.get("id");
    
    // If there's no ID in the URL, we don't need to do anything
    // The handleNewConversation function will handle this case
    if (!id) {
      return;
    }
    
    // Only fetch if we have a different conversation ID
    if (id !== currentChatId) {
      fetchConversation(id)
        .then(messages => {
          if (messages) {
            onConversationLoad(messages, id);
          }
        })
        .catch(error => {
          onError(error instanceof Error ? error.message : "Failed to load conversation");
          // Reset URL and conversation state
          window.history.pushState({}, "", "/");
          onConversationLoad([{ role: "ai", content: "Hello! How can I help you today?" }], null);
        });
    }
  }, [searchParams, onConversationLoad, currentChatId, onError]);

  return null;
}

export default function ClientPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    messages,
    isLoading,
    searchStatus,
    searchResults,
    rateLimitError,
    retryAfter,
    currentChatId,
    error,
    sendMessage,
    setMessages,
    setCurrentChatId,
    deleteThread,
    setRateLimitError,
    setRetryAfter,
    setError,
    resetConversation,
  } = useMessageHandler({
    onThreadsUpdate: setThreads,
  });

  // Load initial threads
  useEffect(() => {
    const storedThreads = localStorage.getItem("chatThreads");
    if (storedThreads) {
      setThreads(JSON.parse(storedThreads));
    }
  }, []);

  const handleNewConversation = React.useCallback(() => {
    resetConversation();
  }, [resetConversation]);

  const handleDeleteThread = React.useCallback(
    (threadId: string) => {
      deleteThread(threadId);
    },
    [deleteThread]
  );

  const handleConversationLoad = React.useCallback(
    (messages: Message[], id: string | null) => {
      setMessages(messages);
      setCurrentChatId(id);
    },
    [setMessages, setCurrentChatId]
  );

  const handleError = React.useCallback((error: string) => {
    setError(error);
  }, [setError]);

  const [initialChips] = React.useState([
    {
      text: "Summarize this article",
      url: "https://www.cnbc.com/2024/12/07/the-fed-is-on-course-to-cut-interest-rates-in-december-but-what-happens-next-is-anyones-guess.html",
    },
    {
      text: "How do I use tools with the Groq API?",
      url: "https://console.groq.com/docs/tool-use",
    },
    {
      text: "Tell me about the new Gemini model",
      url: "https://workspace.google.com/blog/product-announcements/new-gemini-gems-deeper-knowledge-and-business-context",
    },
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen bg-[#343541] overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      }
    >
      <div className="flex h-screen bg-[#343541] overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-10 transition-transform duration-300 ease-in-out`}
        >
          <ChatSidebar
            currentChatId={currentChatId}
            threads={threads}
            onDeleteThread={handleDeleteThread}
            onNewConversation={handleNewConversation}
          />
        </div>

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[5]"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <Header
            onNewConversation={handleNewConversation}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
          <ConversationLoader 
            onConversationLoad={handleConversationLoad} 
            currentChatId={currentChatId}
            onError={handleError}
          />
          
          {/* Error Banners */}
          <div className="relative z-10">
            {rateLimitError && (
              <RateLimitBanner
                retryAfter={retryAfter}
                onTimeUp={() => {
                  setRateLimitError(false);
                  setRetryAfter(0);
                  setError(null);
                }}
              />
            )}
            {error && !rateLimitError && (
              <ErrorBanner
                message={error}
                action={{
                  label: "Start New Chat",
                  onClick: handleNewConversation
                }}
              />
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <MessageList
              messages={messages}
              isLoading={isLoading}
              searchStatus={searchStatus}
              searchResults={searchResults}
            />
          </div>

          {/* Input Area */}
          <InputArea
            onSend={sendMessage}
            isLoading={isLoading}
            initialChips={initialChips}
            disabled={rateLimitError || isLoading}
            placeholder={rateLimitError ? "Please wait before sending another message..." : "Type a message..."}
          />
        </div>
      </div>
    </Suspense>
  );
}
