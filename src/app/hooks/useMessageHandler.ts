import { useState, useCallback, useEffect } from "react";
import { Message, ChatThread } from "../types";
import { fetchConversation } from "../api/services/conversation";

interface UseMessageHandlerProps {
  initialMessages?: Message[];
  onThreadsUpdate?: (threads: ChatThread[]) => void;
}

export function useMessageHandler({
  initialMessages = [
    { role: "ai", content: "Hello! How can I help you today?" },
  ],
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
  const [isProcessingStream, setIsProcessingStream] = useState(false);
  const [shouldSkipFetch, setShouldSkipFetch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetConversation = useCallback(() => {
    setMessages(initialMessages);
    setCurrentChatId(null);
    setConversationId(null);
    setError(null);
    setSearchResults([]);
    setSearchStatus("");
    setIsProcessingStream(false);
    setShouldSkipFetch(false);
    window.history.pushState({}, "", "/");
  }, [initialMessages]);

  // Load conversation securely
  const loadConversation = useCallback(async (id: string) => {
    if (shouldSkipFetch) {
      setShouldSkipFetch(false);
      return;
    }
    
    setError(null);
    try {
      setIsLoading(true);
      const conversation = await fetchConversation(id);
      
      if (conversation) {
        setMessages(conversation);
        setShouldSkipFetch(true); // Skip the next fetch that might be triggered by setCurrentChatId
        setCurrentChatId(id);
        setConversationId(id);
      } else {
        // Handle not found or access denied
        setMessages([{
          role: "ai",
          content: "This conversation could not be loaded."
        }]);
        setCurrentChatId(null);
        window.history.pushState({}, "", "/");
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setMessages([{
        role: "ai",
        content: error instanceof Error ? error.message : "Failed to load conversation"
      }]);
      setCurrentChatId(null);
      window.history.pushState({}, "", "/");
      setError(error instanceof Error ? error.message : "Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, [initialMessages]);

  // Effect to load conversation when currentChatId changes
  useEffect(() => {
    if (currentChatId && !isProcessingStream && !shouldSkipFetch) {
      loadConversation(currentChatId);
    }
  }, [currentChatId, loadConversation, isProcessingStream, shouldSkipFetch]);

  const saveToLocalStorage = useCallback(
    (messages: Message[], chatId: string) => {
      const threads = JSON.parse(
        localStorage.getItem("chatThreads") || "[]"
      ) as ChatThread[];

      // Find first non-placeholder message for title
      const firstNonPlaceholderMessage = messages.find(
        msg => msg.content !== "Hello! How can I help you today?"
      );

      const title = firstNonPlaceholderMessage
        ? firstNonPlaceholderMessage.content.slice(0, 30) + "..."
        : "New Chat";

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
    setIsProcessingStream(true);
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
                      setShouldSkipFetch(true); // Skip fetch when setting new chat ID
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
    } finally {
      setIsProcessingStream(false);
      setShouldSkipFetch(false);
    }
  };

  const sendMessage = useCallback(
    async (message: string) => {
      setIsLoading(true);
      try {
        const userMessage = { role: "user" as const, content: message };
        setMessages(prev => {
          const updated = [...prev, userMessage];
          return updated;
        });

        const response = await fetch("/api/chat-handler", {
          method: "POST",
          credentials: "include",
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

  // Only save to localStorage after successful API operations
  const updateLocalStorage = useCallback((messages: Message[], chatId: string) => {
    if (!chatId) return;
    saveToLocalStorage(messages, chatId);
  }, [saveToLocalStorage]);

  const deleteThread = useCallback(
    (threadId: string) => {
      const threads = JSON.parse(
        localStorage.getItem("chatThreads") || "[]"
      ) as ChatThread[];
      const updatedThreads = threads.filter(t => t.id !== threadId);
      localStorage.setItem("chatThreads", JSON.stringify(updatedThreads));
      onThreadsUpdate?.(updatedThreads);

      // If we're deleting the current thread, clear the current state
      if (threadId === currentChatId) {
        setMessages([]);
        setCurrentChatId(null);
        window.history.pushState({}, "", "/");
      }
    },
    [currentChatId, onThreadsUpdate]
  );

  return {
    messages,
    isLoading,
    searchResults,
    searchStatus,
    conversationId,
    currentChatId,
    rateLimitError,
    retryAfter,
    error,
    sendMessage,
    setMessages,
    setCurrentChatId,
    saveToLocalStorage,
    deleteThread,
    setRateLimitError,
    setRetryAfter,
    setError,
    resetConversation,
  };
}
