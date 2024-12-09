"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import "../../styles/animations.css";
import { Message } from "../types";
import Header from "./Header";
import MessageList from "./MessageList";
import InputArea from "./InputArea";
import RateLimitBanner from "./RateLimitBanner";
import {
  handleChatRequest,
  handleConversationRequest,
} from "../api/actions/api-handler";

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

async function fetchConversation(id: string): Promise<Message[] | null> {
  try {
    const response = await handleConversationRequest(id);
    if (response.ok) {
      const data = response.data;
      if (!data) throw new Error("No data received");
      return data.messages;
    } else if (response.status !== 404) {
      console.error("Error fetching conversation");
    }
    return null;
  } catch {
    console.error("Error fetching conversation:");
    return null;
  }
}

export default function ClientPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      title: string;
      link: string;
      source: string;
    }>
  >([]);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialChips] = useState([
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

  const handleNewConversation = () => {
    setMessages([{ role: "ai", content: "Hello! How can I help you today?" }]);
    setConversationId(null);
    // Remove the conversation ID from the URL
    window.history.pushState({}, "", window.location.pathname);
  };

  const handleConversationLoad = React.useCallback(
    (loadedMessages: Message[], id: string | null) => {
      setMessages(loadedMessages);
      setConversationId(id);
    },
    []
  );

  const processStreamingResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>
  ) => {
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(5));
              switch (data.type) {
                case "status":
                  setSearchStatus(data.content);
                  break;
                case "searchResult":
                  setSearchResults(prev => [...prev, data.content]);
                  break;
                case "completion":
                  setMessages(prev => [
                    ...prev,
                    { role: "ai", content: data.content },
                  ]);
                  setIsLoading(false);
                  setSearchStatus("");
                  setConversationId(data.conversationId);
                  setSearchResults([]);
                  const newUrl = `${window.location.pathname}?id=${data.conversationId}`;
                  window.history.pushState({}, "", newUrl);
                  break;
                case "error":
                  throw new Error(data.content);
              }
            } catch (e) {
              console.error("Error parsing SSE message:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error reading stream:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          content: "Sorry, there was an error processing your request.",
        },
      ]);
      setIsLoading(false);
      setSearchStatus("");
      setSearchResults([]);
    }
  };

  const sendMessage = async (messageContent: string) => {
    const userMessage = { role: "user" as const, content: messageContent };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setSearchStatus("");
    setSearchResults([]);

    try {
      const response = await fetch("/api/chat-handler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageContent,
          messages,
          conversationId,
        }),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("retry-after") || "20"
        );
        setRateLimitError(true);
        setRetryAfter(retryAfter);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();

      await processStreamingResponse(reader);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          content: "Sorry, there was an error processing your request.",
        },
      ]);
      setIsLoading(false);
      setSearchStatus("");
      setSearchResults([]);
    }
  };

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
