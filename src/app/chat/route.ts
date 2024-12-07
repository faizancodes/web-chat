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
          "You are an expert at answering questions in a clear and concise manner. Always make sure your responses are in valid markdown format.",
      },
      ...chatHistory,
      {
        role: "user",
        content: userPrompt,
      },
    ];

    console.log("groqMessages", groqMessages);

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: groqMessages,
    });

    const reply = completion.choices[0].message.content;

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
