import { NextResponse } from "next/server";
import { ScrapedContent, scrapeUrl, urlPattern } from "@/utils/scraper";
import { saveConversation } from "@/utils/redis";
import { nanoid } from "nanoid";
import { Logger } from "@/utils/logger";
import { getGoogleSearchResults } from "@/utils/googleSearch";
import { getLLMResponse } from "@/utils/llmClient";

const logger = new Logger("api/chat");

// Add type for the chat message
type ChatMessage = {
  role: "user" | "ai";
  content: string;
};

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

    let googleResults: ScrapedContent[] = [];
    if (urls.length === 0) {
      logger.info("No URLs found in message, searching Google");
      googleResults = await getGoogleSearchResults(message, 5);
      logger.info("Google results:", googleResults);
    }

    // Scrape all URLs in parallel
    const scrapedResults = await Promise.all(
      urls.map((url: string) => scrapeUrl(url))
    );

    logger.debug("Scraped content from URLs:", scrapedResults);

    let userPrompt = `Here is my question: "${message}".`;

    if (googleResults.length > 0) {
      userPrompt += `\n\nHere are relevant search results:\n${googleResults
        .map(
          result =>
            `Title: ${result.title}\n` +
            `Link: ${result.url}\n` +
            `Description: ${result.metaDescription}\n` +
            `Content: ${result.content}\n---`
        )
        .join("\n")}`;
    }

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

    const systemPrompt = `You are an expert who answers questions with the rigor and citation practices of scholarly research papers, while also being concise, clear, and conversational.
    
    Here are the rules for generating your responses:

    - Format your responses in valid markdown
    - Every single claim, fact, or statement must be supported by a citation to the provided sources
    - Citations should be in academic format: According to [Source Name](URL), "relevant quote or paraphrase"
    - If synthesizing multiple sources, cite them all: Research from [Source 1](URL1) and [Source 2](URL2) indicates...
    - Include a "References" section at the end listing all cited sources
    - Maintain a conversational tone
    - Be explicit about source credibility and limitations
    - If information is missing or sources are inadequate, acknowledge these gaps
    - Never make claims without citation support
    - Structure longer responses with clear headings and subheadings
    `;

    const llmMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...chatHistory,
      {
        role: "user",
        content: userPrompt,
      },
    ];

    logger.debug("Prepared Groq messages for completion");

    // Attempt completion with retries and fallbacks
    const reply = await getLLMResponse(llmMessages);
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
      { error: `Failed to process the chat request: ${error}` },
      { status: 500 }
    );
  }
}
