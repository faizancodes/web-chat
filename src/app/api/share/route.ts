import { NextResponse } from "next/server";
import { createSharedConversation } from "@/utils/redis";
import { Logger } from "@/utils/logger";

const logger = new Logger("api/share");

export async function POST(req: Request) {
  logger.info("Received share conversation request");

  try {
    const { conversationId } = await req.json();
    logger.info("Processing share request for conversation:", {
      conversationId,
    });

    if (!conversationId) {
      logger.warn("Share request rejected: Missing conversation ID");
      return NextResponse.json(
        { error: "Missing conversation ID" },
        { status: 400 }
      );
    }

    logger.info("Creating shared conversation...", { conversationId });
    const sharedId = await createSharedConversation(conversationId);

    if (!sharedId) {
      logger.error("Failed to create shared conversation", { conversationId });
      return NextResponse.json(
        { error: "Failed to create shared conversation" },
        { status: 500 }
      );
    }

    logger.info("Successfully created shared conversation", {
      conversationId,
      sharedId,
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
