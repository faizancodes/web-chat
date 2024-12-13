import { Message } from "../../types";
import { handleConversationRequest } from "../actions/api-handler";
import { streamChat } from "../actions/chat";
import { Logger } from "@/utils/logger";

const logger = new Logger("services/conversation");

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
  logger.info("Starting to process streaming response");

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        logger.info("Stream complete");
        break;
      }
      
      if (value) {
        logger.info("Received chunk of data", { bytes: value.length });
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          logger.info("Processing SSE line", { 
            preview: line.slice(0, 100) + "..."
          });
          try {
            const data = JSON.parse(line.slice(5));
            logger.info("Parsed SSE data", { type: data.type });
            switch (data.type) {
              case "status":
                logger.info("Status update", { content: data.content });
                handlers.onStatus(data.content);
                break;
              case "searchResult":
                logger.info("Search result received");
                handlers.onSearchResult(data.content);
                break;
              case "completion":
                logger.info("Completion received", { 
                  length: data.content.length 
                });
                handlers.onCompletion(data.content, data.conversationId);
                break;
              case "error":
                logger.error("Error in stream", new Error(data.content));
                handlers.onError(new Error(data.content));
                break;
            }
          } catch (e) {
            logger.error("Error parsing SSE message", e as Error);
            handlers.onError(e as Error);
          }
        }
      }
    }
  } catch (error) {
    logger.error("Error in processStreamingResponse", error as Error);
    handlers.onError(error as Error);
  }
}

export async function sendMessage(
  messageContent: string,
  messages: Message[],
  conversationId: string | null
) {
  logger.info("Starting sendMessage", { 
    messageLength: messageContent.length,
    messagesCount: messages.length,
    conversationId 
  });
  
  const response = await streamChat(messageContent, messages, conversationId);
  
  if (!response.body) {
    logger.error("No response body received from streamChat");
    throw new Error("No response body received");
  }
  
  logger.info("Received response from streamChat", {
    ok: response.ok,
    status: response.status,
    hasBody: !!response.body
  });
  
  return response;
}
