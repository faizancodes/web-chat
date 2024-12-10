import { Message } from "../../types";
import { handleConversationRequest } from "../actions/api-handler";

export async function fetchConversation(id: string): Promise<Message[] | null> {
  try {
    const response = await handleConversationRequest(id);
    if (response.ok) {
      const data = response.data;
      if (!data) throw new Error("No data received");
      return data.messages;
    } else if (response.status !== 404) {
      console.error("Error fetching conversation");
    }
    return null;
  } catch {
    console.error("Error fetching conversation:");
    return null;
  }
}

interface StreamHandlers {
  onStatus: (status: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSearchResult: (result: any) => void;
  onCompletion: (content: string, conversationId: string) => void;
  onError: (error: Error) => void;
}

export async function processStreamingResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: StreamHandlers
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
                handlers.onStatus(data.content);
                break;
              case "searchResult":
                handlers.onSearchResult(data.content);
                break;
              case "completion":
                handlers.onCompletion(data.content, data.conversationId);
                break;
              case "error":
                handlers.onError(new Error(data.content));
                break;
            }
          } catch (e) {
            console.error("Error parsing SSE message:", e);
            handlers.onError(e as Error);
          }
        }
      }
    }
  } catch (error) {
    handlers.onError(error as Error);
  }
}

export async function sendMessage(
  messageContent: string,
  messages: Message[],
  conversationId: string | null
) {
  const response = await fetch("/api/chat-handler", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: messageContent,
      messages,
      conversationId,
    }),
  });

  return response;
}
