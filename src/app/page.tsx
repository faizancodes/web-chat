"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import "../styles/animations.css";
import { Message } from "./types";
import Header from "./components/Header";
import MessageList from "./components/MessageList";
import InputArea from "./components/InputArea";
import RateLimitBanner from "./components/RateLimitBanner";

// ConversationLoader component to handle URL params and conversation loading
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
    const response = await fetch(`/api/conversation/${id}`);
    if (response.ok) {
      const data = await response.json();
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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleConversationLoad = React.useCallback(
    (loadedMessages: Message[], id: string | null) => {
      setMessages(loadedMessages);
      setConversationId(id);
    },
    []
  );

  const sendMessage = async (messageContent: string) => {
    const userMessage = { role: "user" as const, content: messageContent };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageContent,
          messages: messages,
          conversationId,
        }),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "20"
        );
        setRateLimitError(true);
        setRetryAfter(retryAfter);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update conversation ID and URL
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        const newUrl = `${window.location.pathname}?id=${data.conversationId}`;
        window.history.pushState({}, "", newUrl);
      }

      setMessages(prev => [...prev, { role: "ai", content: data.reply }]);
    } catch {
      console.error("Error sending message");
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          content: "Sorry, there was an error processing your request.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#343541]">
      <Header />
      <Suspense fallback={null}>
        <ConversationLoader onConversationLoad={handleConversationLoad} />
      </Suspense>
      {rateLimitError && <RateLimitBanner retryAfter={retryAfter} />}
      <MessageList messages={messages} isLoading={isLoading} />
      <InputArea
        onSend={sendMessage}
        isLoading={isLoading}
        initialChips={initialChips}
      />
    </div>
  );
}
