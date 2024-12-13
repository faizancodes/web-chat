import { Message } from "../../types";
import { handleConversationRequest } from "../actions/api-handler";
import { streamChat } from "../actions/chat";

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
  console.log("Starting to process streaming response");

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("Stream complete");
        break;
      }
      
      if (value) {
        console.log("Received chunk of data:", value.length, "bytes");
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          console.log("Processing SSE line:", line.slice(0, 100) + "...");
          try {
            const data = JSON.parse(line.slice(5));
            console.log("Parsed SSE data type:", data.type);
            switch (data.type) {
              case "status":
                console.log("Status update:", data.content);
                handlers.onStatus(data.content);
                break;
              case "searchResult":
                console.log("Search result received");
                handlers.onSearchResult(data.content);
                break;
              case "completion":
                console.log("Completion received, length:", data.content.length);
                handlers.onCompletion(data.content, data.conversationId);
                break;
              case "error":
                console.error("Error in stream:", data.content);
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
    console.error("Error in processStreamingResponse:", error);
    handlers.onError(error as Error);
  }
}

export async function sendMessage(
  messageContent: string,
  messages: Message[],
  conversationId: string | null
) {
  console.log("Starting sendMessage with content:", messageContent);
  const response = await streamChat(messageContent, messages, conversationId);
  
  if (!response.body) {
    console.error("No response body received from streamChat");
    throw new Error("No response body received");
  }
  
  console.log("Received response from streamChat:", {
    ok: response.ok,
    status: response.status,
    hasBody: !!response.body
  });
  
  return response;
}
