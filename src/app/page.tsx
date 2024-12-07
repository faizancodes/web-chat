"use client";

import React, { useState, useRef, KeyboardEvent, Fragment } from "react";
import "../styles/animations.css";

type Message = {
  role: "user" | "ai";
  content: string;
};

type MessageSegment = {
  type: "text" | "url";
  content: string;
};

// Utility function to detect URLs and split content into segments
const parseMessageContent = (content: string): MessageSegment[] => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;
  const segments: MessageSegment[] = [];

  tempDiv.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.replace(/&nbsp;/g, " ").trim();
      if (text) {
        segments.push({ type: "text", content: text });
      }
    } else if (
      node instanceof HTMLSpanElement &&
      node.classList.contains("url-chip")
    ) {
      segments.push({ type: "url", content: node.textContent || "" });
    }
  });

  return segments;
};

// Add URL detection utility function
const detectURLs = (text: string): MessageSegment[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  const matches = Array.from(text.matchAll(urlRegex));

  if (matches.length === 0) {
    return [{ type: "text", content: text }];
  }

  matches.forEach(match => {
    const url = match[0];
    const index = match.index!;

    // Add text before URL if exists
    if (index > lastIndex) {
      const textContent = text.slice(lastIndex, index);
      if (textContent.trim()) {
        segments.push({ type: "text", content: textContent });
      }
    }

    // Add URL
    segments.push({ type: "url", content: url });
    lastIndex = index + url.length;
  });

  // Add remaining text after last URL if exists
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      segments.push({ type: "text", content: remainingText });
    }
  }

  return segments;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!inputRef.current || !inputRef.current.textContent?.trim()) return;

    // Reset rate limit error
    setRateLimitError(false);

    // Get the raw HTML content
    const rawContent = inputRef.current.innerHTML;

    // Parse the content using our updated parseMessageContent
    const segments = parseMessageContent(rawContent);
    const messageContent = segments
      .filter(segment => segment.content.trim() !== "") // Remove empty segments
      .map(segment => segment.content)
      .join(" ");

    // Add user message to the conversation
    const userMessage = { role: "user" as const, content: messageContent };
    setMessages(prev => [...prev, userMessage]);

    // Clear the input
    inputRef.current.innerHTML = "";
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageContent }),
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

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || "";
    setMessage(content);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#343541]">
      {/* Header */}
      <div className="w-full bg-[#343541] border-b border-gray-600 p-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold text-white">Web Chat</h1>
        </div>
      </div>

      {/* Rate Limit Error Banner */}
      {rateLimitError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-lg font-medium">
              You've exceeded the message limit. Please wait {retryAfter}{" "}
              seconds before sending another message.
            </p>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto pb-32 pt-4">
        <div className="max-w-3xl mx-auto px-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 mb-4 ${
                msg.role === "ai"
                  ? "justify-start"
                  : "justify-end flex-row-reverse"
              }`}
            >
              {msg.role === "ai" && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-gray-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.79 0 1.5-.71 1.5-1.5S8.79 9 8 9s-1.5.71-1.5 1.5S7.21 11 8 11zm8 0c.79 0 1.5-.71 1.5-1.5S16.79 9 16 9s-1.5.71-1.5 1.5.71 1.5 1.5 1.5zm-4 4c2.21 0 4-1.79 4-4h-8c0 2.21 1.79 4 4 4z" />
                  </svg>
                </div>
              )}
              <div
                className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                  msg.role === "ai"
                    ? "bg-[#444654] text-white"
                    : "bg-gray-100 text-black ml-auto"
                }`}
              >
                {detectURLs(msg.content).map((segment, i) => (
                  <React.Fragment key={i}>
                    {segment.type === "url" ? (
                      <a
                        href={segment.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-block px-2 py-0.5 rounded hover:opacity-80 transition-opacity ${
                          msg.role === "ai"
                            ? "bg-[#565869] text-blue-300"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {segment.content}
                      </a>
                    ) : (
                      <span className="whitespace-pre-wrap">
                        {segment.content}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-gray-500"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.79 0 1.5-.71 1.5-1.5S8.79 9 8 9s-1.5.71-1.5 1.5S7.21 11 8 11zm8 0c.79 0 1.5-.71 1.5-1.5S16.79 9 16 9s-1.5.71-1.5 1.5.71 1.5 1.5 1.5zm-4 4c2.21 0 4-1.79 4-4h-8c0 2.21 1.79 4 4 4z" />
                </svg>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-[#444654] text-white">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 w-full bg-[#343541] border-t border-gray-600 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-center">
            <div
              ref={inputRef}
              contentEditable
              onInput={handleInput}
              onKeyPress={handleKeyPress}
              className="flex-1 rounded-xl border border-gray-600 bg-[#40414f] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] max-h-32 overflow-y-auto"
              data-placeholder="Type your message..."
              onPaste={e => {
                e.preventDefault();
                const text = e.clipboardData.getData("text");
                const selection = window.getSelection();
                if (selection?.rangeCount) {
                  const range = selection.getRangeAt(0);
                  range.deleteContents();

                  // Use detectURLs instead of parseMessageContent for paste operation
                  const segments = detectURLs(text);

                  segments.forEach((segment, index) => {
                    if (segment.type === "url") {
                      const span = document.createElement("span");
                      span.className =
                        "inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded mx-1 whitespace-nowrap url-chip";
                      span.contentEditable = "false";
                      span.textContent = segment.content;

                      // If this is the first segment and it's a URL, don't add space before
                      if (index > 0) {
                        const space = document.createTextNode(" ");
                        range.insertNode(space);
                      }

                      range.insertNode(span);

                      // Only add space after if there's more content
                      if (index < segments.length - 1) {
                        const space = document.createTextNode(" ");
                        range.insertNode(space);
                      }

                      range.setStartAfter(span);
                    } else {
                      const textNode = document.createTextNode(segment.content);
                      range.insertNode(textNode);

                      // Only add space after text if there's more content
                      if (index < segments.length - 1) {
                        const space = document.createTextNode(" ");
                        range.insertNode(space);
                      }

                      range.setStartAfter(textNode);
                    }
                    range.collapse(true);
                  });

                  selection.removeAllRanges();
                  selection.addRange(range);
                }

                // Update message state with the text content
                if (inputRef.current) {
                  setMessage(inputRef.current.textContent || "");
                }
              }}
            />
            <style jsx>{`
              div[contenteditable][data-placeholder]:empty:before {
                content: attr(data-placeholder);
                color: #666;
                font-style: italic;
              }
            `}</style>
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-blue-500 text-white px-5 py-3 rounded-xl hover:bg-blue-600 transition-all disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
