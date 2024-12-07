import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { env } from "../../config/env";
import axios from "axios";
import * as cheerio from "cheerio";

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

// URL regex pattern that matches http/https URLs
const urlPattern =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Function to clean text content
function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
}

// Function to scrape content from a URL
async function scrapeUrl(url: string) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Remove script tags, style tags, and comments
    $("script").remove();
    $("style").remove();
    $("noscript").remove();
    $("iframe").remove();

    // Extract useful information
    const title = $("title").text();
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const h2 = $("h2")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // Get text from important elements
    const articleText = $("article")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const mainText = $("main")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const contentText = $('.content, #content, [class*="content"]')
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // Get all paragraph text
    const paragraphs = $("p")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // Get list items
    const listItems = $("li")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // Combine all content
    let combinedContent = [
      title,
      metaDescription,
      h1,
      h2,
      articleText,
      mainText,
      contentText,
      paragraphs,
      listItems,
    ].join(" ");

    // Clean and truncate the content
    combinedContent = cleanText(combinedContent).slice(0, 10000);

    console.log("combinedContent", combinedContent);

    console.log("Scraped content length:", combinedContent.length);

    return {
      url,
      title: cleanText(title),
      headings: {
        h1: cleanText(h1),
        h2: cleanText(h2),
      },
      metaDescription: cleanText(metaDescription),
      content: combinedContent,
      error: null,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return {
      url,
      title: "",
      headings: { h1: "", h2: "" },
      metaDescription: "",
      content: "",
      error: "Failed to scrape URL",
    };
  }
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    console.log("message", message);

    // Extract URLs from the message
    const urls = message.match(urlPattern) || [];
    console.log("Found URLs:", urls);

    // Scrape all URLs in parallel
    const scrapedResults = await Promise.all(
      urls.map((url: string) => scrapeUrl(url))
    );

    console.log("scrapedResults", scrapedResults);

    let systemPrompt =
      "You are an expert at answering questions I have in a clear and concise manner.";

    if (scrapedResults.length > 0) {
      systemPrompt = `You are an expert at analyzing information from webpages and providing answers from them. Here is the context from the URLs:\n${scrapedResults
        .map(
          result =>
            `URL: ${result.url}\n` +
            `Title: ${result.title}\n` +
            `H1: ${result.headings.h1}\n` +
            `H2: ${result.headings.h2}\n` +
            `Description: ${result.metaDescription}\n` +
            `Content: ${result.content}\n---`
        )
        .join("\n")}`;
    }

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Here is my question: "${message}".`,
        },
      ],
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
