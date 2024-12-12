import { NextResponse } from "next/server";
import { ScrapedContent, scrapeUrl, urlPattern } from "@/utils/scraper";
import { saveConversation } from "@/utils/redis";
import { nanoid } from "nanoid";
import { Logger } from "@/utils/logger";
import { searchGoogle, scrapeGoogleSearchResults } from "@/utils/googleSearch";
import { getLLMResponse } from "@/utils/llmClient";
import { needsWebSearch } from "@/utils/groqClient";

const logger = new Logger("api/chat");

// Add type for the chat message
type ChatMessage = {
  role: "user" | "ai";
  content: string;
};

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { message, messages = [], conversationId } = await req.json();
    logger.info(`Processing new chat request`, {
      conversationId: conversationId || "new",
      messageLength: message.length,
      existingMessagesCount: messages.length,
    });

    // Set up streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the response
    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    let scrapedResults: ScrapedContent[] = [];

    // Background processing
    (async () => {
      try {
        const currentConversationId = conversationId || nanoid();
        const urls = message.match(urlPattern) || [];
        logger.info(`URL detection complete`, {
          conversationId: currentConversationId,
          urlsFound: urls.length,
          urls,
        });

        if (urls.length === 0) {
          // Check if web search is needed
          const requiresWebSearch = await needsWebSearch(message);
          logger.info(`Web search requirement check`, {
            conversationId: currentConversationId,
            requiresWebSearch,
          });

          if (requiresWebSearch) {
            logger.info(`Starting Google search`, {
              conversationId: currentConversationId,
              query: message,
            });

            // Send searching status
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({ type: "status", content: "Searching Google..." })}\n\n`
              )
            );

            // Get search results
            const searchResults = await searchGoogle(message, 5);
            logger.info(`Google search completed`, {
              conversationId: currentConversationId,
              resultsCount: searchResults.length,
            });

            // Stream each search result as it's found
            for (const result of searchResults) {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "searchResult",
                    content: {
                      title: result.title,
                      link: result.link,
                      source: result.source,
                    },
                  })}\n\n`
                )
              );
            }

            // Send scraping status
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({ type: "status", content: "Scraping search results..." })}\n\n`
              )
            );

            logger.info(`Starting content scraping`, {
              conversationId: currentConversationId,
              urlsToScrape: searchResults.length,
            });
            scrapedResults = await scrapeGoogleSearchResults(searchResults);
            logger.info(`Content scraping completed`, {
              conversationId: currentConversationId,
              scrapedResultsCount: scrapedResults.length,
            });
          }
        } else {
          logger.info(`No web search required`, {
            conversationId: currentConversationId,
          });

          // Extract URLs from the message
          const urls = message.match(urlPattern) || [];
          logger.info("Found URLs in message:", urls);

          logger.info(`Scraping URLs`, {
            conversationId: currentConversationId,
            urlsToScrape: urls.length,
          });
          // Scrape all URLs in parallel
          scrapedResults = await Promise.all(
            urls.map((url: string) => scrapeUrl(url))
          );
        }

        // Convert frontend messages to ChatMessage format
        const chatHistory = messages.map((msg: ChatMessage) => ({
          role: msg.role === "ai" ? "assistant" : "user",
          content: msg.content,
        }));

        let userPrompt = `Here is my question: "${message}".`;

        for (const result of scrapedResults) {
          userPrompt += `\n\nSource: ${result.url}\n\n${result.content}`;
        }

        logger.info(`Preparing LLM request`, {
          conversationId: currentConversationId,
          promptLength: userPrompt.length,
          historyLength: chatHistory.length,
        });

        const systemPrompt = `You are an expert who answers questions with the rigor and citation practices of scholarly research papers, while also being concise, clear, and conversational.
    
          Here are the rules for generating your responses:

          - Format your responses in valid markdown
          - Every single claim, fact, or statement must be supported by a citation to the provided sources
          - If only 1 source is provided, just cite it once in your response, theres no need to cite it multiple times
          - If synthesizing multiple sources, cite them all: Research from [Source 1](URL1) and [Source 2](URL2) indicates...
          - Include a "References" section at the end listing all cited sources
          - Maintain a conversational tone
          - Be explicit about source credibility and limitations
          - If information is missing or sources are inadequate, acknowledge these gaps
          - Structure longer responses with clear headings and subheadings
          - If the question is subjective in nature, don't say something like "is subjective and depends on etc..", just generate a response and let the user decide
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

        logger.info(`Sending request to LLM`, {
          conversationId: currentConversationId,
          messageCount: llmMessages.length,
        });

        const reply = await getLLMResponse(llmMessages);
        logger.info(`Received LLM response`, {
          conversationId: currentConversationId,
          replyLength: reply.length,
        });

        // Send final response
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "completion",
              content: reply,
              conversationId: currentConversationId,
            })}\n\n`
          )
        );

        // Save conversation
        const updatedMessages = [
          ...messages,
          { role: "user", content: message },
          { role: "ai", content: reply },
        ];
        await saveConversation(currentConversationId, updatedMessages);
        logger.info("Chat request completed successfully", {
          conversationId: currentConversationId,
          processingTimeMs: Date.now() - startTime,
          finalMessageCount: updatedMessages.length,
        });
        logger.info("Attempting to close writer stream", {
          conversationId: currentConversationId,
        });
        await writer.close();
        logger.info("Writer stream closed successfully", {
          conversationId: currentConversationId,
        });
      } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error("Error in background processing:", {
          error,
          processingTimeMs: processingTime,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              content:
                error instanceof Error
                  ? error.message
                  : "An unknown error occurred",
            })}\n\n`
          )
        );
        await writer.close();
      }
    })();

    return response;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error("Error in main request handler:", {
      error,
      processingTimeMs: processingTime,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: `Failed to process the chat request: ${error}` },
      { status: 500 }
    );
  }
}
