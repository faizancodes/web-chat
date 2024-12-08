import { Redis } from "@upstash/redis";
import { env } from "../config/env";
import { Message } from "../app/types";
import { Logger } from "./logger";
import { nanoid } from "nanoid";

const logger = new Logger("redis");

// Initialize Redis client
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

// Helper functions
export async function saveConversation(id: string, messages: Message[]) {
  try {
    logger.info(`Saving conversation with ID: ${id}`);
    await redis.set(`conversation:${id}`, JSON.stringify(messages));
    // Set expiration to 7 days
    await redis.expire(`conversation:${id}`, 7 * (24 * 60 * 60));
    logger.info(
      `Successfully saved conversation ${id} with ${messages.length} messages`
    );
  } catch (error) {
    logger.error(`Failed to save conversation ${id}: ${error}`);
    throw error;
  }
}

export async function getConversation(id: string): Promise<Message[] | null> {
  try {
    logger.info(`Fetching conversation with ID: ${id}`);
    const data = await redis.get(`conversation:${id}`);

    if (!data) {
      logger.info(`No conversation found for ID: ${id}`);
      return null;
    }

    if (typeof data === "string") {
      const messages = JSON.parse(data);
      logger.info(
        `Successfully retrieved conversation ${id} with ${messages.length} messages`
      );
      return messages;
    }

    logger.info(`Successfully retrieved conversation ${id}`);
    return data as Message[];
  } catch (error) {
    logger.error(`Error retrieving conversation ${id}: ${error}`);
    return null;
  }
}

// Create a snapshot of a conversation for sharing
export async function createSharedConversation(
  originalId: string
): Promise<string | null> {
  try {
    // Get the original conversation
    const messages = await getConversation(originalId);
    if (!messages) return null;

    // Create a new ID for the shared version
    const sharedId = nanoid();

    // Save as a shared conversation with a different prefix
    await redis.set(`shared:${sharedId}`, JSON.stringify(messages));
    // Set expiration to 30 days for shared conversations
    await redis.expire(`shared:${sharedId}`, 30 * (24 * 60 * 60));

    logger.info(`Created shared conversation ${sharedId} from ${originalId}`);
    return sharedId;
  } catch (error) {
    logger.error(
      `Failed to create shared conversation from ${originalId}: ${error}`
    );
    return null;
  }
}

// Get a shared conversation
export async function getSharedConversation(
  id: string
): Promise<Message[] | null> {
  try {
    logger.info(`Fetching shared conversation with ID: ${id}`);
    const data = await redis.get(`shared:${id}`);

    if (!data) {
      logger.info(`No shared conversation found for ID: ${id}`);
      return null;
    }

    if (typeof data === "string") {
      const messages = JSON.parse(data);
      logger.info(
        `Successfully retrieved shared conversation ${id} with ${messages.length} messages`
      );
      return messages;
    }

    return data as Message[];
  } catch (error) {
    logger.error(`Error retrieving shared conversation ${id}: ${error}`);
    return null;
  }
}
