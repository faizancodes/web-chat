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

// Constants for expiration times
const EXPIRATION_TIMES = {
  SESSION: 24 * 60 * 60, // 1 day
  CONVERSATION: 7 * 24 * 60 * 60, // 7 days
  SHARED_CONVERSATION: 30 * 24 * 60 * 60, // 30 days
} as const;

// Helper functions
export async function saveConversation(id: string, messages: Message[], sessionId: string) {
  try {
    logger.info(`Saving conversation with ID: ${id}`);
    
    // First, ensure the conversation is associated with the session
    const success = await associateConversationWithSession(id, sessionId);
    if (!success) {
      logger.error(`Failed to associate conversation ${id} with session ${sessionId}`);
      throw new Error("Failed to associate conversation");
    }

    // Then save the conversation data
    await redis.set(`conversation:${id}`, JSON.stringify(messages));
    await redis.expire(`conversation:${id}`, EXPIRATION_TIMES.CONVERSATION);
    
    logger.info(
      `Successfully saved conversation ${id} with ${messages.length} messages`
    );
    return true;
  } catch (error) {
    logger.error(`Failed to save conversation ${id}: ${error}`);
    throw error;
  }
}

export async function getConversationSecure(id: string, sessionId: string): Promise<Message[] | null> {
  try {
    logger.info(`Attempting secure fetch of conversation ${id} for session ${sessionId}`);
    
    // First verify access
    const hasAccess = await verifyConversationAccess(id, sessionId);
    if (!hasAccess) {
      logger.warn(`Access denied to conversation ${id} for session ${sessionId}`);
      return null;
    }

    // If access verified, get the conversation
    const data = await redis.get(`conversation:${id}`);
    if (!data) {
      logger.info(`No conversation found for ID: ${id}`);
      return null;
    }

    const messages = typeof data === 'string' ? JSON.parse(data) : data;
    logger.info(
      `Successfully retrieved conversation ${id} with ${messages.length} messages`
    );
    return messages;
  } catch (error) {
    logger.error(`Error retrieving conversation ${id}: ${error}`);
    return null;
  }
}

// Create a snapshot of a conversation for sharing
export async function createSharedConversation(
  originalId: string,
  sessionId: string
): Promise<string | null> {
  try {
    // First verify ownership
    const hasAccess = await verifyConversationAccess(originalId, sessionId);
    if (!hasAccess) {
      logger.warn(`Unauthorized attempt to share conversation ${originalId} by session ${sessionId}`);
      return null;
    }

    // Get the conversation securely
    const messages = await getConversationSecure(originalId, sessionId);
    if (!messages) return null;

    // Create a new ID for the shared version
    const sharedId = nanoid();

    // Save as a shared conversation with a different prefix
    await redis.set(`shared:${sharedId}`, JSON.stringify({
      messages,
      originalId,
      sharedBy: sessionId,
      sharedAt: Date.now()
    }));
    
    await redis.expire(`shared:${sharedId}`, EXPIRATION_TIMES.SHARED_CONVERSATION);

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
): Promise<{ messages: Message[]; metadata: { sharedBy: string; sharedAt: number } } | null> {
  try {
    logger.info(`Fetching shared conversation with ID: ${id}`);
    const data = await redis.get(`shared:${id}`);

    if (!data) {
      logger.info(`No shared conversation found for ID: ${id}`);
      return null;
    }

    const { messages, sharedBy, sharedAt } = typeof data === 'string' 
      ? JSON.parse(data) 
      : data;

    logger.info(
      `Successfully retrieved shared conversation ${id} with ${messages.length} messages`
    );
    
    return { 
      messages,
      metadata: {
        sharedBy,
        sharedAt
      }
    };
  } catch (error) {
    logger.error(`Error retrieving shared conversation ${id}: ${error}`);
    return null;
  }
}

// Session Management
export async function storeSession(sessionId: string, data: any = {}) {
  try {
    logger.info(`Storing session: ${sessionId}`);
    const key = `session:${sessionId}`;
    await redis.set(key, JSON.stringify({
      ...data,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    }));
    await redis.expire(key, EXPIRATION_TIMES.SESSION);
    logger.info(`Successfully stored session: ${sessionId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to store session ${sessionId}: ${error}`);
    return false;
  }
}

export async function getSession(sessionId: string) {
  try {
    logger.info(`Fetching session: ${sessionId}`);
    const key = `session:${sessionId}`;
    const data = await redis.get(key);
    
    if (!data) {
      logger.info(`No session found for ID: ${sessionId}`);
      return null;
    }

    // Update last accessed time
    const sessionData = typeof data === 'string' ? JSON.parse(data) : data;
    sessionData.lastAccessed = Date.now();
    await redis.set(key, JSON.stringify(sessionData));
    
    logger.info(`Successfully retrieved session: ${sessionId}`);
    return sessionData;
  } catch (error) {
    logger.error(`Error retrieving session ${sessionId}: ${error}`);
    return null;
  }
}

export async function deleteSession(sessionId: string) {
  try {
    logger.info(`Deleting session: ${sessionId}`);
    const key = `session:${sessionId}`;
    await redis.del(key);
    logger.info(`Successfully deleted session: ${sessionId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete session ${sessionId}: ${error}`);
    return false;
  }
}

// Conversation ownership management
export async function associateConversationWithSession(conversationId: string, sessionId: string) {
  try {
    logger.info(`Associating conversation ${conversationId} with session ${sessionId}`);
    
    // Store in both directions for efficient lookups
    const setKey = `session:${sessionId}:conversations`;
    const ownerKey = `conversation:${conversationId}:session`;
    
    logger.debug(`Setting association - Set Key: ${setKey}, Owner Key: ${ownerKey}`);
    
    // First, check if conversation is already associated
    const existingOwner = await redis.get(ownerKey);
    if (existingOwner) {
      logger.info(`Conversation ${conversationId} already associated with session ${existingOwner}`);
      return existingOwner === sessionId;
    }
    
    // Store the associations
    await redis.sadd(setKey, conversationId);
    await redis.set(ownerKey, sessionId);
    
    // Set expiration for conversation ownership
    await redis.expire(ownerKey, EXPIRATION_TIMES.CONVERSATION);
    await redis.expire(setKey, EXPIRATION_TIMES.CONVERSATION);
    
    // Verify the association was stored correctly
    const storedOwner = await redis.get(ownerKey);
    const isInSet = await redis.sismember(setKey, conversationId);
    
    logger.debug(`Association verification - Stored Owner: ${storedOwner}, In Set: ${isInSet}`);
    
    if (storedOwner !== sessionId || !isInSet) {
      logger.error(`Failed to verify conversation association - Owner: ${storedOwner}, In Set: ${isInSet}`);
      return false;
    }
    
    logger.info(`Successfully associated conversation ${conversationId} with session ${sessionId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to associate conversation ${conversationId} with session ${sessionId}: ${error}`);
    return false;
  }
}

export async function verifyConversationAccess(conversationId: string, sessionId: string): Promise<boolean> {
  try {
    logger.info(`Verifying access to conversation ${conversationId} for session ${sessionId}`);
    
    if (!sessionId) {
      logger.warn('No session ID provided for access verification');
      return false;
    }

    const key = `conversation:${conversationId}:session`;
    const ownerSessionId = await redis.get(key);
    
    logger.debug(`Conversation ownership check - Key: ${key}, Owner: ${ownerSessionId}, Current: ${sessionId}`);
    
    if (!ownerSessionId) {
      // If no owner is set, this might be a new conversation
      // Let's try to associate it
      const associated = await associateConversationWithSession(conversationId, sessionId);
      if (associated) {
        logger.info(`New conversation ${conversationId} associated with session ${sessionId}`);
        return true;
      }
      logger.warn(`No ownership record found for conversation ${conversationId}`);
      return false;
    }
    
    const hasAccess = ownerSessionId === sessionId;
    logger.info(`Access ${hasAccess ? 'granted' : 'denied'} to conversation ${conversationId} for session ${sessionId}`);
    return hasAccess;
  } catch (error) {
    logger.error(`Error verifying conversation access: ${error}`);
    return false;
  }
}

export async function getSessionConversations(sessionId: string): Promise<string[]> {
  try {
    logger.info(`Fetching conversations for session ${sessionId}`);
    const conversations = await redis.smembers(`session:${sessionId}:conversations`);
    logger.info(`Found ${conversations.length} conversations for session ${sessionId}`);
    return conversations;
  } catch (error) {
    logger.error(`Error fetching session conversations: ${error}`);
    return [];
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    logger.info(`Deleting conversation: ${conversationId}`);
    // Get the session ID first to clean up the reverse mapping
    const sessionId = await redis.get(`conversation:${conversationId}:session`);
    
    if (sessionId) {
      // Remove from session's conversation set
      await redis.srem(`session:${sessionId}:conversations`, conversationId);
    }
    
    // Delete conversation ownership
    await redis.del(`conversation:${conversationId}:session`);
    // Delete conversation data
    await redis.del(`conversation:${conversationId}`);
    
    logger.info(`Successfully deleted conversation: ${conversationId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete conversation ${conversationId}: ${error}`);
    return false;
  }
}

export async function cleanupSessionData(sessionId: string) {
  try {
    logger.info(`Cleaning up data for session: ${sessionId}`);
    
    // Get all conversations for this session
    const conversations = await getSessionConversations(sessionId);
    
    // Delete each conversation
    await Promise.all(conversations.map(convId => deleteConversation(convId)));
    
    // Delete session's conversation set
    await redis.del(`session:${sessionId}:conversations`);
    // Delete session data
    await redis.del(`session:${sessionId}`);
    
    logger.info(`Successfully cleaned up session: ${sessionId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to clean up session ${sessionId}: ${error}`);
    return false;
  }
}

// Rate limiting for conversation creation
export async function checkConversationRateLimit(sessionId: string): Promise<boolean> {
  try {
    const key = `ratelimit:conversation:${sessionId}`;
    const limit = 50; // Maximum conversations per day
    const current = await redis.incr(key);
    
    // Set expiration if this is the first increment
    if (current === 1) {
      await redis.expire(key, 24 * 60 * 60); // 1 day
    }
    
    return current <= limit;
  } catch (error) {
    logger.error(`Error checking conversation rate limit: ${error}`);
    return false;
  }
}
