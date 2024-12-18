import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { storeSession, getSession, saveConversation } from "@/utils/redis";
import { Logger } from "@/utils/logger";
import { nanoid } from "nanoid";

const logger = new Logger("continue-route");

export async function POST(request: Request) {
  try {
    logger.info("Starting continue request processing");
    
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      logger.warn("Invalid messages format", { messages });
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }
    
    logger.info(`Processing continue request with ${messages.length} messages`);
    
    const cookieStore = cookies();
    let sessionId = cookieStore.get("session")?.value;
    
    logger.debug("Session check", { 
      hasSession: !!sessionId,
      sessionId: sessionId || 'none'
    });

    // If no session exists, create one
    if (!sessionId) {
      sessionId = crypto.randomBytes(32).toString("hex");
      logger.info("Creating new session", { sessionId });
      
      const sessionStored = await storeSession(sessionId, {
        created: new Date().toISOString()
      });
      
      if (!sessionStored) {
        logger.error("Failed to store new session");
        return NextResponse.json(
          { error: "Failed to create session" },
          { status: 500 }
        );
      }
      logger.info("New session created successfully");
    }

    // Generate a new conversation ID
    const conversationId = nanoid();
    logger.info("Generated new conversation ID", { conversationId });

    // Save the conversation
    try {
      const success = await saveConversation(conversationId, messages, sessionId);
      if (!success) {
        logger.error("Failed to save conversation", { conversationId, sessionId });
        return NextResponse.json(
          { error: "Failed to save conversation" },
          { status: 500 }
        );
      }
      logger.info("Conversation saved successfully", { conversationId });
    } catch (error) {
      logger.error("Error saving conversation", { 
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        sessionId
      });
      throw error;
    }

    const response = NextResponse.json({
      conversationId,
      success: true
    });

    // Set the session cookie if it was just created
    if (!cookieStore.get("session")) {
      logger.info("Setting session cookie", { sessionId });
      response.cookies.set({
        name: "session",
        value: sessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        path: "/",
        maxAge: 1 * 24 * 60 * 60, // 1 day
      });
    }

    logger.info("Continue request completed successfully", {
      conversationId,
      sessionId
    });
    return response;
  } catch (error) {
    logger.error("Error in continue route:", {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
