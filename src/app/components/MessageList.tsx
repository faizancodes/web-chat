"use client";

import { useEffect, useRef } from "react";
import { Message as MessageType } from "../types";
import Message from "./Message";
import LoadingIndicator from "./LoadingIndicator";
import SearchProgress from "./SearchProgress";

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  searchStatus?: string;
  searchResults?: Array<{
    title: string;
    link: string;
    source: string;
  }>;
}

export default function MessageList({
  messages,
  isLoading,
  searchStatus,
  searchResults = [],
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (
      messages[messages.length - 1]?.role === "ai" ||
      searchResults.length > 0
    ) {
      scrollToBottom();
    }
  }, [messages, searchResults]);

  return (
    <div className="flex-1 overflow-y-auto pb-32 pt-4">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
        {messages.map((msg, index) => (
          <Message key={index} message={msg} />
        ))}
        {isLoading &&
          (searchStatus ? (
            <SearchProgress
              status={searchStatus}
              searchResults={searchResults}
            />
          ) : (
            <LoadingIndicator />
          ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
