import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { env } from "../../config/env";
import { scrapeUrl, urlPattern } from "@/utils/scraper";

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

// Add type for the chat message
type ChatMessage = {
  role: "user" | "ai";
  content: string;
};

const MODELS: string[] = [
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
    "gemma-7b-it",
  ];

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 500;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function attemptCompletion(messages: any[], currentModel: string, retryCount = 0): Promise<string> {
  try {
    console.log(`Attempting completion with model: ${currentModel}, retry: ${retryCount}`);
    const completion = await groq.chat.completions.create({
      model: currentModel,
      messages: messages,
    });
    if (!completion.choices[0].message.content) {
      throw new Error("Empty response from model");
    }
    return completion.choices[0].message.content;
  } catch (error: any) {
    console.error(`Error with model ${currentModel}:`, error.message);
    
    // If we haven't exceeded retries for current model, retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying with ${currentModel} after ${delay}ms...`);
      await sleep(delay);
      return attemptCompletion(messages, currentModel, retryCount + 1);
    }
    
    // If we've exhausted retries, try next model
    const currentModelIndex = MODELS.indexOf(currentModel);
    if (currentModelIndex < MODELS.length - 1) {
      console.log(`Falling back to next model: ${MODELS[currentModelIndex + 1]}`);
      return attemptCompletion(messages, MODELS[currentModelIndex + 1], 0);
    }
    
    throw new Error("All models and retries exhausted");
  }
}

export async function POST(req: Request) {
  try {
    const { message, messages = [] } = await req.json();

    console.log("Message history:", messages);

    // Extract URLs from the message
    const urls = message.match(urlPattern) || [];
    console.log("Found URLs:", urls);

    // Scrape all URLs in parallel
    const scrapedResults = await Promise.all(
      urls.map((url: string) => scrapeUrl(url))
    );

    console.log("scrapedResults", scrapedResults);

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

    console.log("groqMessages", groqMessages);

    // Attempt completion with retries and fallbacks
    const reply = await attemptCompletion(groqMessages, MODELS[0], 0);

    return NextResponse.json({
      reply,
      scrapedContent: scrapedResults,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process the chat request" },
      { status: 500 }
    );
  }
}
