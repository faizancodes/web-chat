import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Logger } from "@/utils/logger";
import { getConversationSecure, getSessionConversations } from "@/utils/redis";

const logger = new Logger("api/conversation");

export async function GET(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    logger.info(`Received GET request for conversation [${requestId}]`);

    // Get session ID from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (!sessionCookie?.value) {
      logger.warn(`No session cookie found [${requestId}]`);
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    // Get conversation ID from URL
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("id");

    if (!conversationId) {
      // If no ID provided, return list of user's conversations
      logger.info(`Fetching conversation list for session [${requestId}]`);
      const conversations = await getSessionConversations(sessionCookie.value);
      return NextResponse.json({ conversations });
    }

    // Get the specific conversation with session verification
    logger.info(`Fetching conversation ${conversationId} [${requestId}]`);
    const conversation = await getConversationSecure(conversationId, sessionCookie.value);
    
    if (!conversation) {
      logger.warn(`Access denied or conversation not found [${requestId}]: ${conversationId}`);
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    logger.info(`Successfully retrieved conversation [${requestId}]`);
    return NextResponse.json({ conversation });
  } catch (error) {
    logger.error(`Error handling conversation request [${requestId}]:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 