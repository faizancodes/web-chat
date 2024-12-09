import { env } from "@/config/env";
import { Logger } from "./logger";
import { getGroqResponse } from "./groqClient";
import { getGeminiResponse } from "./geminiClient";

const logger = new Logger("utils/llmClient");

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function getLLMResponse(messages: Message[]): Promise<string> {
  logger.info("Attempting to get LLM response", {
    messageCount: messages.length,
  });

  try {
    logger.info("Trying Gemini API first");
    const response = await getGeminiResponse(messages);
    logger.info("Successfully got response from Gemini");
    return response;
  } catch (error) {
    logger.warn("Gemini API failed, falling back to Groq", {
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      const response = await getGroqResponse(
        messages,
        "llama-3.1-8b-instant",
        0
      );
      logger.info("Successfully got response from Groq fallback");
      return response;
    } catch (groqError) {
      logger.error("Both Gemini and Groq APIs failed", {
        geminiError: error instanceof Error ? error.message : String(error),
        groqError:
          groqError instanceof Error ? groqError.message : String(groqError),
      });
      throw groqError; // Re-throw the error after logging
    }
  }
}
