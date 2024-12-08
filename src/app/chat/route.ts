import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { env } from "../../config/env";
import { scrapeUrl, urlPattern } from "@/utils/scraper";
import { saveConversation } from "@/utils/redis";
import { nanoid } from "nanoid";
import { Logger } from "@/utils/logger";

const logger = new Logger("api/chat");

export const maxDuration = 30; // 30 seconds maximum duration
export const dynamic = "force-dynamic";

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

// Add type for the chat message
type ChatMessage = {
  role: "user" | "ai";
  content: string;
};

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MODELS: string[] = [
  "llama-3.1-8b-instant",
  "llama3-8b-8192",
  "llama3-70b-8192",
  "gemma2-9b-it",
  "gemma-7b-it",
];

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 500;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function attemptCompletion(
  messages: GroqMessage[],
  currentModel: string,
  retryCount = 0
): Promise<string> {
  try {
    logger.info(
      `Attempting completion with model: ${currentModel}, retry: ${retryCount}`
    );
    const completion = await groq.chat.completions.create({
      model: currentModel,
      messages: messages,
    });
    if (!completion.choices[0].message.content) {
      throw new Error("Empty response from model");
    }
    return completion.choices[0].message.content;
  } catch (error: unknown) {
    logger.error(
      `Error with model ${currentModel}:`,
      error instanceof Error ? error.message : String(error)
    );

    // If we haven't exceeded retries for current model, retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      logger.info(`Retrying with ${currentModel} after ${delay}ms...`);
      await sleep(delay);
      return attemptCompletion(messages, currentModel, retryCount + 1);
    }

    // If we've exhausted retries, try next model
    const currentModelIndex = MODELS.indexOf(currentModel);
    if (currentModelIndex < MODELS.length - 1) {
      logger.warn(
        `Falling back to next model: ${MODELS[currentModelIndex + 1]}`
      );
      return attemptCompletion(messages, MODELS[currentModelIndex + 1], 0);
    }

    throw new Error("All models and retries exhausted");
  }
}

export async function POST(req: Request) {
  try {
    const { message, messages = [], conversationId } = await req.json();
    logger.info(`Processing new chat request`, {
      conversationId: conversationId || "new",
    });

    // Generate a new conversation ID if not provided
    const currentConversationId = conversationId || nanoid();

    logger.debug("Message history:", messages);

    // Extract URLs from the message
    const urls = message.match(urlPattern) || [];
    logger.info("Found URLs in message:", urls);

    // Scrape all URLs in parallel
    const scrapedResults = await Promise.all(
      urls.map((url: string) => scrapeUrl(url))
    );

    logger.debug("Scraped content from URLs:", scrapedResults);

    let userPrompt = `Here is my question: "${message}".`;

    if (scrapedResults.length > 0) {
      userPrompt += `\n\nHere is the information from the URLs:\n${scrapedResults
        .map(
          result =>
            `URL: ${result.url}\n` +
            `Title: ${result.title}\n` +
            `Description: ${result.metaDescription}\n` +
            `Content: ${result.content}\n---`
        )
        .join("\n")}.\n Make sure your outputs are in valid markdown format.`;
    }

    // Convert frontend messages to Groq format
    const chatHistory = messages.map((msg: ChatMessage) => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.content,
    }));

    const groqMessages = [
      {
        role: "system",
        content:
          "You are an expert at answering questions in a clear and concise manner. Always make sure your responses are in valid markdown format. Don't ever say 'Here is the answer in markdown format:' or anything like that. Just give the answer.",
      },
      ...chatHistory,
      {
        role: "user",
        content: userPrompt,
      },
    ];

    logger.debug("Prepared Groq messages for completion");

    // Attempt completion with retries and fallbacks
    const reply = await attemptCompletion(groqMessages, MODELS[0], 0);
    logger.info("Successfully generated reply");

    // Create updated messages array
    const updatedMessages = [
      ...messages,
      { role: "user", content: message },
      { role: "ai", content: reply },
    ];

    // Save the updated conversation
    try {
      await saveConversation(currentConversationId, updatedMessages);
      logger.info("Saved conversation successfully", {
        conversationId: currentConversationId,
      });
    } catch (error) {
      logger.error("Error saving conversation:", error);
    }

    return NextResponse.json({
      reply,
      conversationId: currentConversationId,
      scrapedContent: scrapedResults,
    });
  } catch (error) {
    logger.error("Error processing chat request:", error);
    return NextResponse.json(
      { error: "Failed to process the chat request" },
      { status: 500 }
    );
  }
}
