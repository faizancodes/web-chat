"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import "../../styles/animations.css";
import { Message } from "../types";
import Header from "./Header";
import MessageList from "./MessageList";
import InputArea from "./InputArea";
import RateLimitBanner from "./RateLimitBanner";
import { fetchConversation } from "../api/services/conversation";
import { useConversation } from "../hooks/useConversation";

// Component for handling search params
function ConversationLoader({
  onConversationLoad,
}: {
  onConversationLoad: (messages: Message[], id: string | null) => void;
}) {
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      fetchConversation(id).then(messages => {
        if (messages) {
          onConversationLoad(messages, id);
        }
      });
    }
  }, [searchParams, onConversationLoad]);

  return null;
}

export default function ClientPage() {
  const {
    messages,
    isLoading,
    searchStatus,
    searchResults,
    rateLimitError,
    retryAfter,
    handleNewConversation,
    handleConversationLoad,
    sendMessage,
  } = useConversation();

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
        <div className="flex flex-col h-screen bg-[#343541]">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-screen bg-[#343541]">
        <Header onNewConversation={handleNewConversation} />
        <ConversationLoader onConversationLoad={handleConversationLoad} />
        {rateLimitError && <RateLimitBanner retryAfter={retryAfter} />}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          searchStatus={searchStatus}
          searchResults={searchResults}
        />
        <InputArea
          onSend={sendMessage}
          isLoading={isLoading}
          initialChips={initialChips}
        />
      </div>
    </Suspense>
  );
}
