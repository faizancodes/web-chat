import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { Logger } from "@/utils/logger";
const logger = new Logger("api/chat-handler");
const API_KEY = env.API_KEY;
const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api/chat"
    : "https://www.webchat.so/api/chat";
export async function POST(request: Request) {
  try {
    logger.info("Received chat request");
    // 1. Get request body
    const body = await request.json();
    if (!body.message) {
      logger.warn("Request missing required message field");
      return NextResponse.json(
        { error: "Bad request: message is required" },
        { status: 400 }
      );
    }
    logger.info("Making request to chat API", { message: body.message });
    // 2. Make request to chat API
    const chatResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY || "",
      },
      body: JSON.stringify(body),
    });
    // 3. Handle API response
    if (!chatResponse.ok) {
      const errorData = await chatResponse.json().catch(() => ({}));
      logger.error("Chat API request failed", {
        status: chatResponse.status,
        error: errorData.error,
      });
      return NextResponse.json(
        { error: errorData.error || "Chat API request failed" },
        { status: chatResponse.status }
      );
    }
    logger.info("Successfully received chat API response");
    // 4. Forward the streaming response
    return new Response(chatResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Unexpected error in chat handler", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
