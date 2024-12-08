import { Redis } from "@upstash/redis";
import { env } from "../config/env";
import { Message } from "../app/types";

// Initialize Redis client
export const redis = new Redis({
  url: env.REDIS_URL,
  token: env.REDIS_TOKEN,
});

// Helper functions
export async function saveConversation(id: string, messages: Message[]) {
  await redis.set(`conversation:${id}`, JSON.stringify(messages));
  // Set expiration to 7 days
  await redis.expire(`conversation:${id}`, 7 * (24 * 60 * 60));
}

export async function getConversation(id: string): Promise<Message[] | null> {
  const data = await redis.get(`conversation:${id}`);
  if (!data) return null;

  try {
    if (typeof data === "string") {
      return JSON.parse(data);
    }
    return data as Message[];
  } catch (error) {
    console.error("Error parsing conversation data:", error);
    return null;
  }
}
