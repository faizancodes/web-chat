import { Message } from "@/app/types";

export async function sendMessage(
  message: string,
  messages: Message[],
  conversationId: string | null
) {
  return fetch("/api/chat-handler", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      messages,
      conversationId,
    }),
  });
}

export async function fetchConversation(id: string) {
  const response = await fetch(`/api/conversation?id=${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      response.status === 401 ? "Unauthorized: Please sign in" :
      response.status === 403 ? "Access denied: You don't have permission to view this conversation" :
      response.status === 404 ? "Conversation not found" :
      errorData.error || `Failed to fetch conversation: ${response.status}`
    );
  }
  
  const data = await response.json();
  return data.conversation;
}

export async function processStreamingResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: {
    onStatus: (status: string) => void;
    onSearchResult: (result: any) => void;
    onCompletion: (content: string, conversationId: string | null) => void;
    onError: (error: any) => void;
  }
) {
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
                callbacks.onStatus(data.content);
                break;
              case "searchResult":
                callbacks.onSearchResult(data.content);
                break;
              case "completion":
                callbacks.onCompletion(data.content, data.conversationId);
                break;
            }
          } catch (e) {
            console.error("Error parsing SSE message:", e);
          }
        }
      }
    }
  } catch (error) {
    callbacks.onError(error);
  }
}

export async function shareConversation(conversationId: string): Promise<string> {
  const response = await fetch("/api/share", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ conversationId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      response.status === 401 ? "Unauthorized: Please sign in" :
      errorData.error || "Failed to share conversation"
    );
  }

  const data = await response.json();
  return data.sharedId;
}
