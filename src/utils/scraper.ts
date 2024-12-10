import { Browser } from "puppeteer";
import * as cheerio from "cheerio";
import { Redis } from "@upstash/redis";
import { Logger } from "./logger";
import { Browser as CoreBrowser } from "puppeteer-core";
import { getPuppeteerOptions } from "./puppeteerSetup";

const logger = new Logger("scraper");

// URL regex pattern that matches http/https URLs
export const urlPattern =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Initialize Redis client with error handling
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Cache TTL in seconds (7 days)
const CACHE_TTL = 7 * (24 * 60 * 60);
const MAX_CACHE_SIZE = 1024000; // 1MB limit for cached content

// Function to clean text content
function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
}

export interface ScrapedContent {
  url: string;
  title: string;
  headings: {
    h1: string;
    h2: string;
  };
  metaDescription: string;
  content: string;
  error: string | null;
  cachedAt?: number;
}

// Validation function for ScrapedContent
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isValidScrapedContent(data: any): data is ScrapedContent {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.url === "string" &&
    typeof data.title === "string" &&
    typeof data.headings === "object" &&
    typeof data.headings.h1 === "string" &&
    typeof data.headings.h2 === "string" &&
    typeof data.metaDescription === "string" &&
    typeof data.content === "string" &&
    (data.error === null || typeof data.error === "string")
  );
}

// Function to get cache key for a URL with sanitization
function getCacheKey(url: string): string {
  const sanitizedUrl = url.substring(0, 200); // Limit key length
  return `scrape:${sanitizedUrl}`;
}

// Function to get cached content with error handling
async function getCachedContent(url: string): Promise<ScrapedContent | null> {
  try {
    const cacheKey = getCacheKey(url);
    logger.info(`Checking cache for key: ${cacheKey}`);
    const cached = await redis.get(cacheKey);

    if (!cached) {
      logger.info(`Cache miss - No cached content found for: ${url}`);
      return null;
    }

    logger.info(`Cache hit - Found cached content for: ${url}`);

    // Handle both string and object responses from Redis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    if (typeof cached === "string") {
      try {
        parsed = JSON.parse(cached);
      } catch (parseError) {
        logger.error(`JSON parse error for cached content: ${parseError}`);
        await redis.del(cacheKey);
        return null;
      }
    } else {
      parsed = cached;
    }

    if (isValidScrapedContent(parsed)) {
      const age = Date.now() - (parsed.cachedAt || 0);
      logger.info(`Cache content age: ${Math.round(age / 1000 / 60)} minutes`);
      return parsed;
    }

    logger.warn(`Invalid cached content format for URL: ${url}`);
    await redis.del(cacheKey);
    return null;
  } catch (error) {
    logger.error(`Cache retrieval error: ${error}`);
    return null;
  }
}

// Function to cache scraped content with error handling
async function cacheContent(
  url: string,
  content: ScrapedContent
): Promise<void> {
  try {
    const cacheKey = getCacheKey(url);
    content.cachedAt = Date.now();

    // Validate content before serializing
    if (!isValidScrapedContent(content)) {
      logger.error(`Attempted to cache invalid content format for URL: ${url}`);
      return;
    }

    const serialized = JSON.stringify(content);

    if (serialized.length > MAX_CACHE_SIZE) {
      logger.warn(
        `Content too large to cache for URL: ${url} (${serialized.length} bytes)`
      );
      return;
    }

    await redis.set(cacheKey, serialized, { ex: CACHE_TTL });
    logger.info(
      `Successfully cached content for: ${url} (${serialized.length} bytes, TTL: ${CACHE_TTL}s)`
    );
  } catch (error) {
    logger.error(`Cache storage error: ${error}`);
  }
}

// Function to scrape content from a URL using Puppeteer + Cheerio
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Check cache first
    logger.info(`Starting scrape process for: ${url}`);
    const cached = await getCachedContent(url);
    if (cached) {
      logger.info(`Using cached content for: ${url}`);
      return cached;
    }
    logger.info(`Cache miss - proceeding with fresh scrape for: ${url}`);

    let browser: Browser | CoreBrowser | null = null;
    try {
      logger.info("Launching puppeteer browser");

      if (process.env.NODE_ENV === "development") {
        logger.info("Launching puppeteer browser on development");
        const puppeteer = await import("puppeteer");

        const launchOptions = await getPuppeteerOptions();
        logger.info("Launching puppeteer browser on development");
        browser = await puppeteer.launch(launchOptions);
        logger.info("Browser launched successfully");
      } else {
        logger.info("Launching puppeteer-core browser on production");
        const puppeteer = await import("puppeteer-core");

        // Log version information
        logger.info(`Node version: ${process.version}`);

        logger.info("Getting puppeteer options on production");
        const launchOptions = await getPuppeteerOptions();
        logger.info("Launching puppeteer-core browser on production");
        browser = await puppeteer.launch(launchOptions);
      }

      const page = await browser.newPage();
      logger.info("Browser page created");

      // Optimize page settings
      await page.setRequestInterception(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      page.on("request", (req: any) => {
        const resourceType = req.resourceType();
        if (
          resourceType === "image" ||
          resourceType === "stylesheet" ||
          resourceType === "font" ||
          resourceType === "media"
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });

      logger.info("Navigating to URL");
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      // Navigate with reduced wait time
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      logger.info("Page loaded successfully");

      // Get the HTML content directly from the page
      const html = await page.content();
      const $ = cheerio.load(html);
      logger.info("HTML content loaded into Cheerio");

      // Remove unnecessary elements in one go
      $("script, style, noscript, iframe").remove();

      // Extract content efficiently
      const title = $("title").text() || "";
      const metaDescription =
        $('meta[name="description"]').attr("content") || "";

      logger.info("Extracting page content");
      // Enhanced heading extraction
      const headings = {
        h1: $("h1")
          .map((_, el) => $(el).text().trim())
          .get()
          .join(" "),
        h2: $("h2")
          .map((_, el) => $(el).text().trim())
          .get()
          .join(" "),
      };

      // Enhanced content extraction
      const textSelectors = [
        "p", // paragraphs
        "li", // list items
        "td", // table cells
        "th", // table headers
        "blockquote", // quotes
        "article", // article text
        "span", // inline text
        "div", // div text
        "h3", // additional headings
        "h4",
        "h5",
        "h6",
      ];

      const bodyContent = textSelectors
        .map(selector =>
          $(selector)
            .map((_, element) => $(element).text().trim())
            .get()
            .filter(text => text.length > 0)
        )
        .flat()
        .join(" ");

      const combinedContent = cleanText(
        [title, metaDescription, headings.h1, headings.h2, bodyContent].join(
          " "
        )
      ).slice(0, 40000);

      const scrapedContent: ScrapedContent = {
        url,
        title: cleanText(title),
        headings: {
          h1: cleanText(headings.h1),
          h2: cleanText(headings.h2),
        },
        metaDescription: cleanText(metaDescription),
        content: combinedContent,
        error: null,
      };

      // Cache the scraped content
      await cacheContent(url, scrapedContent);
      logger.info("Scraping completed successfully");

      return scrapedContent;
    } finally {
      if (browser) {
        await (browser as Browser).close();
        logger.info("Browser closed");
      }
    }
  } catch (error) {
    logger.error(`Error scraping ${url}: ${error}`);
    const errorContent: ScrapedContent = {
      url,
      title: "",
      headings: { h1: "", h2: "" },
      metaDescription: "",
      content: "",
      error: `Failed to scrape URL: ${(error as Error).message || "Unknown error"}`,
    };
    return errorContent;
  }
}
