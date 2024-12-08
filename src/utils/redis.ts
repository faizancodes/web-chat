import { Redis } from "@upstash/redis";
import { env } from "../config/env";
import { Message } from "../app/types";
import { Logger } from "./logger";

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
