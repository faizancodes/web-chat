"use server";

import { makeApiRequest, ApiResponse } from "./make-api-request";
import { Message } from "@/app/types";
import { Logger } from "@/utils/logger";

const logger = new Logger("api-handler");

type ChatResponse = {
  reply: string;
  conversationId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scrapedContent?: any[];
};

type ConversationResponse = {
  messages: Message[];
};

type ShareResponse = {
  sharedId: string;
};

export async function handleChatRequest(
  message: string,
  messages: Message[],
  conversationId: string | null
): Promise<ApiResponse<ChatResponse>> {
  logger.info("[API] Chat request", {
    message,
    messageCount: messages.length,
    conversationId,
  });
  const response = await makeApiRequest<ChatResponse>("/api/chat", "POST", {
    message,
    messages,
    conversationId,
  });
  logger.info("[API] Chat response", {
    success: response.ok,
    status: response.status,
  });
  return response;
}

export async function handleConversationRequest(id: string) {
  logger.info("[API] Conversation request", { id });
  const response = await makeApiRequest<ConversationResponse>(
    `/api/conversation/${id}`
  );
  logger.info("[API] Conversation response", {
    success: response.ok,
    status: response.status,
  });
  return response;
}

export async function handleShareRequest(conversationId: string) {
  logger.info("[API] Share request", { conversationId });
  const response = await makeApiRequest<ShareResponse>("/api/share", "POST", {
    conversationId,
  });
  logger.info("[API] Share response", {
    success: response.ok,
    status: response.status,
  });
  return response;
}

export async function handleSharedRequest(id: string) {
  logger.info("[API] Shared conversation request", { id });
  const response = await makeApiRequest<ConversationResponse>(
    `/api/shared/${id}`
  );
  logger.info("[API] Shared conversation response", {
    success: response.ok,
    status: response.status,
  });
  return response;
}

export async function handleContinueRequest(messages: Message[]) {
  logger.info("[API] Continue request", { messageCount: messages.length });
  const response = await makeApiRequest<{ conversationId: string }>(
    "/api/continue",
    "POST",
    {
      messages,
    }
  );
  logger.info("[API] Continue response", {
    success: response.ok,
    status: response.status,
  });
  return response;
}
