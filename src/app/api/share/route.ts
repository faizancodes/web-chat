import { NextResponse } from "next/server";
import { createSharedConversation } from "@/utils/redis";
import { Logger } from "@/utils/logger";
import { cookies } from "next/headers";

const logger = new Logger("api/share");

export async function POST(req: Request) {
  logger.info("Received share conversation request");

  try {
    // Get session ID from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (!sessionCookie?.value) {
      logger.warn("Share request rejected: No session found");
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    const { conversationId } = await req.json();
    logger.info("Processing share request for conversation:", {
      conversationId,
      sessionId: sessionCookie.value
    });

    if (!conversationId) {
      logger.warn("Share request rejected: Missing conversation ID");
      return NextResponse.json(
        { error: "Missing conversation ID" },
        { status: 400 }
      );
    }

    logger.info("Creating shared conversation...", { 
      conversationId,
      sessionId: sessionCookie.value
    });
    
    const sharedId = await createSharedConversation(
      conversationId,
      sessionCookie.value
    );

    if (!sharedId) {
      logger.error("Failed to create shared conversation", { 
        conversationId,
        sessionId: sessionCookie.value
      });
      return NextResponse.json(
        { error: "Failed to create shared conversation" },
        { status: 500 }
      );
    }

    logger.info("Successfully created shared conversation", {
      conversationId,
      sharedId,
      sessionId: sessionCookie.value
    });
    
    return NextResponse.json({ sharedId });
  } catch (error) {
    logger.error("Error creating shared conversation:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to create shared conversation" },
      { status: 500 }
    );
  }
}
