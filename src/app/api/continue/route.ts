import { NextResponse } from "next/server";
import { saveConversation } from "@/utils/redis";
import { nanoid } from "nanoid";
import { Logger } from "@/utils/logger";

const logger = new Logger("api/continue");

export async function POST(req: Request) {
  try {
    logger.info("Received continue conversation request");

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      logger.warn("Invalid request: Missing or invalid messages", {
        messagesProvided: !!messages,
        messagesType: typeof messages,
      });
      return NextResponse.json(
        { error: "Missing or invalid messages" },
        { status: 400 }
      );
    }

    logger.debug("Processing continue request", {
      messageCount: messages.length,
    });

    // Generate a new conversation ID
    const newConversationId = nanoid();
    logger.debug("Generated new conversation ID", {
      conversationId: newConversationId,
    });

    // Save the conversation with the existing messages
    try {
      await saveConversation(newConversationId, messages);
      logger.info("Saved continued conversation successfully", {
        conversationId: newConversationId,
        messageCount: messages.length,
      });
    } catch (error) {
      logger.error("Error saving continued conversation", {
        conversationId: newConversationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return NextResponse.json({ conversationId: newConversationId });
  } catch (error) {
    logger.error("Error continuing conversation", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to continue conversation" },
      { status: 500 }
    );
  }
}
