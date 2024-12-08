"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Chip } from "../types";
import { detectURLs, parseMessageContent } from "../utils";

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

    await onSend(messageContent);

    // Clear the input
    if (inputRef.current) {
      inputRef.current.innerHTML = "";
      setMessage("");
    }
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
    <div className="fixed bottom-0 w-full bg-[#343541] border-t border-gray-600 p-2 sm:p-4">
      <div className="max-w-3xl mx-auto px-2 sm:px-4">
        {/* Chips */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 hide-scrollbar">
          {initialChips.map((chip, index) => (
            <a
              key={index}
              href={chip.url}
              onClick={e => handleChipClick(e, chip)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#40414f] text-blue-400 px-3 py-1.5 rounded-full text-sm hover:bg-[#4a4b59] transition-colors border border-gray-600 cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              {chip.text}
            </a>
          ))}
        </div>
        <div className="flex gap-2 sm:gap-3 items-center">
          <div
            ref={inputRef}
            contentEditable
            onInput={handleInput}
            onKeyPress={handleKeyPress}
            className="flex-1 rounded-xl border border-gray-600 bg-[#40414f] px-3 sm:px-4 py-2 sm:py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] max-h-32 overflow-y-auto text-sm sm:text-base"
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
            className="bg-blue-500 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-xl hover:bg-blue-600 transition-all disabled:bg-blue-300 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
