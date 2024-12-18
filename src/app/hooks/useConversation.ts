import { useState, useCallback } from "react";
import { Message } from "../types";
import {
  processStreamingResponse,
  sendMessage,
} from "../api/services/conversation";

interface UseConversationReturn {
  messages: Message[];
  isLoading: boolean;
  searchStatus: string;
  searchResults: Array<{ title: string; link: string; source: string }>;
  rateLimitError: boolean;
  retryAfter: number;
  conversationId: string | null;
  handleNewConversation: () => void;
  handleConversationLoad: (id: string) => Promise<void>;
  sendMessage: (messageContent: string) => Promise<void>;
}

export function useConversation(): UseConversationReturn {
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

  const handleNewConversation = useCallback(() => {
    setMessages([{ role: "ai", content: "Hello! How can I help you today?" }]);
    setConversationId(null);
    window.history.pushState({}, "", window.location.pathname);
  }, []);

  const handleConversationLoad = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversation?id=${encodeURIComponent(id)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Handle unauthorized access
          handleNewConversation();
          throw new Error('Unauthorized access to conversation');
        }
        throw new Error('Failed to load conversation');
      }

      const data = await response.json();
      if (data.conversation) {
        setMessages(data.conversation);
        setConversationId(id);
        const newUrl = `${window.location.pathname}?id=${id}`;
        window.history.pushState({}, "", newUrl);
      } else {
        // Handle not found or access denied
        handleNewConversation();
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      handleNewConversation();
    } finally {
      setIsLoading(false);
    }
  }, [handleNewConversation]);

  const handleMessage = async (messageContent: string) => {
    const userMessage = { role: "user" as const, content: messageContent };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setSearchStatus("");
    setSearchResults([]);

    try {
      const response = await sendMessage(
        messageContent,
        messages,
        conversationId
      );

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

      await processStreamingResponse(reader, {
        onStatus: setSearchStatus,
        onSearchResult: result => setSearchResults(prev => [...prev, result]),
        onCompletion: (content, newConversationId) => {
          setMessages(prev => [...prev, { role: "ai", content }]);
          setIsLoading(false);
          setSearchStatus("");
          setConversationId(newConversationId);
          setSearchResults([]);
          if (newConversationId) {
            const newUrl = `${window.location.pathname}?id=${newConversationId}`;
            window.history.pushState({}, "", newUrl);
          }
        },
        onError: error => {
          console.error("Error:", error);
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
        },
      });
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

  return {
    messages,
    isLoading,
    searchStatus,
    searchResults,
    rateLimitError,
    retryAfter,
    conversationId,
    handleNewConversation,
    handleConversationLoad,
    sendMessage: handleMessage,
  };
}
