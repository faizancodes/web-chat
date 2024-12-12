"use server";

import { env } from "@/config/env";
import { Logger } from "@/utils/logger";
import { Message } from "@/app/types";

const logger = new Logger("actions/chat");
const API_KEY = env.API_KEY;
const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api/chat"
    : "https://www.webchat.so/api/chat";

export async function streamChat(
  message: string,
  messages: Message[] = [],
  conversationId: string | null = null
) {
  try {
    logger.info("Received chat request");

    if (!message) {
      logger.warn("Request missing required message field");
      throw new Error("Bad request: message is required");
    }

    logger.info("Making request to chat API", { message, conversationId });

    // Make request to chat API
    const chatResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY || "",
      },
      body: JSON.stringify({
        message,
        messages,
        conversationId,
      }),
    });

    // Handle API response
    if (!chatResponse.ok) {
      const errorData = await chatResponse.json().catch(() => ({}));
      logger.error("Chat API request failed", {
        status: chatResponse.status,
        error: errorData.error,
      });
      throw new Error(errorData.error || "Chat API request failed");
    }

    logger.info("Successfully received chat API response");

    // Return the response body and status
    return {
      body: chatResponse.body,
      ok: chatResponse.ok,
      status: chatResponse.status,
      headers: {
        retryAfter: chatResponse.headers.get("retry-after"),
      },
    };
  } catch (error) {
    logger.error("Unexpected error in chat handler", { error });
    throw error;
  }
}