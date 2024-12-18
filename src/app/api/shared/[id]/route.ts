import { NextRequest, NextResponse } from "next/server";
import { getSharedConversation } from "@/utils/redis";
import { Logger } from "@/utils/logger";

const logger = new Logger("api/shared");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  logger.info("Received GET request for shared conversation");

  try {
    const { id } = await context.params;
    logger.info(`Processing request for conversation ID: ${id}`);

    if (!id) {
      logger.warn("Request received with missing conversation ID");
      return NextResponse.json(
        { error: "Missing conversation ID" },
        { status: 400 }
      );
    }

    logger.info(`Fetching shared conversation with ID: ${id}`);
    const conversation = await getSharedConversation(id);

    if (!conversation) {
      logger.warn(`No conversation found for ID: ${id}`);
      return NextResponse.json(
        { error: "Shared conversation not found" },
        { status: 404 }
      );
    }

    logger.info(`Successfully retrieved conversation for ID: ${id}`);
    return NextResponse.json({
      messages: conversation.messages,
      metadata: conversation.metadata
    });
  } catch (error) {
    logger.error("Error fetching shared conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared conversation" },
      { status: 500 }
    );
  }
}
