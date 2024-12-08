"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Message as MessageType } from "../types";

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  return (
    <div
      className={`flex gap-2 mb-4 w-full ${
        message.role === "ai"
          ? "justify-start items-start"
          : "justify-end items-start"
      } animate-fadeIn`}
    >
      <div
        className={`flex gap-2 items-start w-full ${
          message.role === "ai" ? "flex-row" : "flex-row-reverse"
        }`}
      >
        {message.role === "ai" ? (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.79 0 1.5-.71 1.5-1.5S8.79 9 8 9s-1.5.71-1.5 1.5S7.21 11 8 11zm8 0c.79 0 1.5-.71 1.5-1.5S16.79 9 16 9s-1.5.71-1.5 1.5.71 1.5 1.5 1.5zm-4 4c2.21 0 4-1.79 4-4h-8c0 2.21 1.79 4 4 4z" />
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#4177DC] flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z" />
            </svg>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl ${
            message.role === "ai"
              ? `bg-[#444654] text-white ${message.content === "Hello! How can I help you today?" ? "max-w-fit" : "max-w-[85%] sm:max-w-[80%]"}`
              : "bg-[#4177DC] text-white shadow-sm min-w-[100px] max-w-[85%] sm:max-w-[80%]"
          } overflow-hidden transform transition-all duration-200 ease-out`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            className={`prose max-w-none break-words ${
              message.role === "ai" ? "prose-invert" : "prose-white"
            }`}
            components={{
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <div className="max-w-full overflow-x-auto my-4 rounded-lg">
                    <div className="flex items-center justify-between bg-[#1e1e1e] px-3 sm:px-4 py-2 rounded-t-lg border-b border-[#333]">
                      <span className="text-xs text-gray-400">{match[1]}</span>
                      <div className="flex gap-1.5">
                        <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-[#ff5f56]" />
                        <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-[#ffbd2e]" />
                        <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-[#27c93f]" />
                      </div>
                    </div>
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        borderRadius: "0 0 0.5rem 0.5rem",
                        padding: "0.75rem 1rem",
                        fontSize: "0.8125rem",
                        lineHeight: "1.5",
                        backgroundColor: "#1e1e1e",
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code
                    className={`${className} text-xs sm:text-sm px-1.5 py-0.5 rounded ${
                      message.role === "ai" ? "bg-[#2d2d2d]" : "bg-gray-200"
                    }`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              p: ({ children }) => {
                const isGreeting = String(children).startsWith(
                  "Hello! How can I help you"
                );
                return (
                  <p
                    className={`mb-2 last:mb-0 break-words text-sm sm:text-base ${
                      message.role === "ai"
                        ? `text-white text-left ${isGreeting ? "text-wrap" : "whitespace-pre-wrap"}`
                        : "text-white text-left whitespace-pre-wrap"
                    }`}
                  >
                    {children}
                  </p>
                );
              },
              pre: ({ children }) => (
                <pre className="max-w-full overflow-x-auto -mx-4 sm:mx-0">
                  {children}
                </pre>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:underline break-all ${
                    message.role === "ai" ? "text-blue-400" : "text-blue-200"
                  }`}
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
