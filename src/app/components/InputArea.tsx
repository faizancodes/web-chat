"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Chip } from "../types";
import { detectURLs, parseMessageContent } from "../utils";
import { IoSendSharp } from "react-icons/io5";

interface InputAreaProps {
  onSend: (message: string) => Promise<void>;
  isLoading: boolean;
  initialChips: Chip[];
}

export default function InputArea({
  onSend,
  isLoading,
  initialChips,
}: InputAreaProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!inputRef.current || !inputRef.current.textContent?.trim()) return;

    // Get the raw HTML content
    const rawContent = inputRef.current.innerHTML;

    // Parse the content using our updated parseMessageContent
    const segments = parseMessageContent(rawContent);
    const messageContent = segments
      .filter(segment => segment.content.trim() !== "") // Remove empty segments
      .map(segment => segment.content)
      .join(" ");

    // Clear the input before sending to ensure immediate feedback
    if (inputRef.current) {
      inputRef.current.innerHTML = "";
      inputRef.current.textContent = "";
      setMessage("");
    }

    // Send the message after clearing
    await onSend(messageContent);
  };

  const handleChipClick = async (
    e: React.MouseEvent,
    chip: { text: string; url: string }
  ) => {
    e.preventDefault();
    const messageContent = `${chip.text} ${chip.url}`;
    await onSend(messageContent);
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
    <div className="fixed bottom-0 w-full backdrop-blur-md bg-[#343541]/80 border-t border-gray-600/50 p-2 pb-safe sm:p-4">
      <div className="max-w-3xl mx-auto px-2 sm:px-4">
        {/* Chips */}
        <div className="flex gap-2.5 mb-3 overflow-x-auto pb-2.5 hide-scrollbar">
          {initialChips.map((chip, index) => (
            <a
              key={index}
              href={chip.url}
              onClick={e => handleChipClick(e, chip)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#40414f]/90 text-blue-400 px-4 py-2 rounded-full text-sm hover:bg-[#4a4b59] transition-all duration-200 border border-gray-600/50 cursor-pointer whitespace-nowrap flex-shrink-0 hover:scale-105"
            >
              {chip.text}
            </a>
          ))}
        </div>
        <div className="flex gap-2 sm:gap-3 items-end">
          <div
            ref={inputRef}
            contentEditable
            onInput={handleInput}
            onKeyPress={handleKeyPress}
            className="flex-1 rounded-2xl border border-gray-600/50 bg-[#40414f]/90 backdrop-blur-sm px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent min-h-[48px] max-h-40 overflow-y-auto text-base transition-all duration-200 hover:bg-[#40414f]/95"
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
              color: rgba(255, 255, 255, 0.4);
              font-style: normal;
              pointer-events: none;
              transition: all 0.2s ease;
            }

            .url-chip {
              background: rgba(59, 130, 246, 0.1);
              color: rgba(59, 130, 246, 0.9);
              border-radius: 0.5rem;
              transition: all 0.2s ease;
            }

            .url-chip:hover {
              background: rgba(59, 130, 246, 0.15);
              transform: translateY(-1px);
            }

            /* Hide scrollbar for Chrome, Safari and Opera */
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }

            /* Hide scrollbar for IE, Edge and Firefox */
            .hide-scrollbar {
              -ms-overflow-style: none; /* IE and Edge */
              scrollbar-width: none; /* Firefox */
            }
          `}</style>
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="flex-shrink-0 bg-blue-500/90 hover:bg-blue-600 text-white p-3 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[48px] min-w-[48px] flex items-center justify-center backdrop-blur-sm hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <IoSendSharp className="w-5 h-5 transform rotate-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
