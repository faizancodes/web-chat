"use client";

import React, { useState } from "react";
import "../styles/animations.css";
import { Message } from "./types";
import Header from "./components/Header";
import MessageList from "./components/MessageList";
import InputArea from "./components/InputArea";
import RateLimitBanner from "./components/RateLimitBanner";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
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

  const sendMessage = async (messageContent: string) => {
    // Add user message to the conversation
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
        }),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "20"
        );
        console.log("Rate limit hit:", { retryAfter });
        setRateLimitError(true);
        setRetryAfter(retryAfter);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Add AI response to the conversation
      setMessages(prev => [...prev, { role: "ai", content: data.reply }]);
    } catch (error) {
      console.error("Error:", error);
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
