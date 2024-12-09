import Groq from "groq-sdk";
import { env } from "../config/env";
import { Logger } from "./logger";
import { Message } from "./llmClient";

const logger = new Logger("utils/groqClient");

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

export const MODELS: string[] = [
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

export async function getGroqResponse(
  messages: Message[],
  currentModel: string,
  retryCount = 0
): Promise<string> {
  try {
    logger.info(
      `Attempting completion with model: ${currentModel}, retry: ${retryCount}`
    );

    logger.debug("GROQ Messages:", messages);
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
      return getGroqResponse(messages, currentModel, retryCount + 1);
    }

    // If we've exhausted retries, try next model
    const currentModelIndex = MODELS.indexOf(currentModel);
    if (currentModelIndex < MODELS.length - 1) {
      logger.warn(
        `Falling back to next model: ${MODELS[currentModelIndex + 1]}`
      );
      return getGroqResponse(messages, MODELS[currentModelIndex + 1], 0);
    }

    throw new Error("All models and retries exhausted");
  }
}
