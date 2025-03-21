import { NextRequest, NextResponse } from "next/server";
import { getConversation } from "@/utils/redis";
import { Logger } from "@/utils/logger";

const logger = new Logger("api/conversation");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  logger.info("Received GET request for conversation");

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

    logger.info(`Fetching conversation with ID: ${id}`);
    const conversation = await getConversation(id);

    if (!conversation) {
      logger.warn(`Conversation not found for ID: ${id}`);
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    logger.info(`Successfully retrieved conversation for ID: ${id}`);
    return NextResponse.json({ messages: conversation });
  } catch (error) {
    logger.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}
