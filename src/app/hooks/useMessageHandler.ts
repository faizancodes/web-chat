import { useState, useCallback, useEffect } from "react";
import { Message, ChatThread } from "../types";

interface UseMessageHandlerProps {
  initialMessages?: Message[];
  onThreadsUpdate?: (threads: ChatThread[]) => void;
}

export function useMessageHandler({
  initialMessages = [],
  onThreadsUpdate,
}: UseMessageHandlerProps = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ title: string; link: string; source: string }>
  >([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const saveToLocalStorage = useCallback(
    (messages: Message[], chatId: string) => {
      const threads = JSON.parse(
        localStorage.getItem("chatThreads") || "[]"
      ) as ChatThread[];

      const title = messages[0]?.content.slice(0, 30) + "..." || "New Chat";
      const lastMessage =
        messages[messages.length - 1]?.content.slice(0, 50) + "..." || "";

      const threadIndex = threads.findIndex(t => t.id === chatId);
      const newThread: ChatThread = {
        id: chatId,
        title,
        lastMessage,
        timestamp: Date.now(),
        messages,
      };

      if (threadIndex !== -1) {
        threads[threadIndex] = newThread;
      } else {
        threads.unshift(newThread);
      }

      localStorage.setItem("chatThreads", JSON.stringify(threads));
      onThreadsUpdate?.(threads);
    },
    [onThreadsUpdate]
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
                  setMessages(prev => {
                    const newMessage: Message = {
                      role: "ai",
                      content: data.content,
                    };
                    const updated = [...prev, newMessage];
                    if (data.conversationId) {
                      saveToLocalStorage(updated, data.conversationId);
                      setCurrentChatId(data.conversationId);
                      setConversationId(data.conversationId);
                      const newUrl = `${window.location.pathname}?id=${data.conversationId}`;
                      window.history.pushState({}, "", newUrl);
                    }
                    return updated;
                  });
                  setIsLoading(false);
                  setSearchResults([]);
                  setSearchStatus("");
                  break;
              }
            } catch (e) {
              console.error("Error parsing SSE message:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing stream:", error);
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(
    async (message: string) => {
      setIsLoading(true);
      try {
        const userMessage = { role: "user" as const, content: message };
        setMessages(prev => {
          const updated = [...prev, userMessage];
          if (currentChatId) {
            saveToLocalStorage(updated, currentChatId);
          }
          return updated;
        });

        const response = await fetch("/api/chat-handler", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            messages,
            conversationId: currentChatId,
          }),
        });

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("retry-after") || "20"
          );
          setRetryAfter(retryAfter);
          setIsLoading(false);
          setRateLimitError(true);
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
        setMessages(prev => {
          const updated = [
            ...prev,
            {
              role: "ai" as const,
              content: "Sorry, there was an error processing your request.",
            },
          ];
          if (currentChatId) {
            saveToLocalStorage(updated, currentChatId);
          }
          return updated;
        });
        setIsLoading(false);
      }
    },
    [messages, currentChatId, saveToLocalStorage]
  );

  // Load conversation from localStorage when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      const threads = JSON.parse(
        localStorage.getItem("chatThreads") || "[]"
      ) as ChatThread[];
      const thread = threads.find(t => t.id === currentChatId);
      if (thread) {
        setMessages(thread.messages);
      }
    }
  }, [currentChatId]);

  return {
    messages,
    isLoading,
    searchResults,
    searchStatus,
    conversationId,
    currentChatId,
    rateLimitError,
    retryAfter,
    sendMessage,
    setMessages,
    setCurrentChatId,
    saveToLocalStorage,
  };
}
