import * as puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { Redis } from "@upstash/redis";

// URL regex pattern that matches http/https URLs
export const urlPattern =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Initialize Redis client with error handling
const redis = new Redis({
  url: process.env.REDIS_URL || "",
  token: process.env.REDIS_TOKEN || "",
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
    console.log(`[Cache] Checking cache for key: ${cacheKey}`);
    const cached = await redis.get(cacheKey);

    if (!cached) {
      console.log(`[Cache] Miss - No cached content found for: ${url}`);
      return null;
    }

    console.log(`[Cache] Hit - Found cached content for: ${url}`);

    // Handle both string and object responses from Redis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    if (typeof cached === "string") {
      try {
        parsed = JSON.parse(cached);
      } catch (parseError) {
        console.error("[Cache] JSON parse error:", parseError);
        await redis.del(cacheKey);
        return null;
      }
    } else {
      // If Redis returned an object directly, use it as is
      parsed = cached;
    }

    if (isValidScrapedContent(parsed)) {
      const age = Date.now() - (parsed.cachedAt || 0);
      console.log(
        `[Cache] Content age: ${Math.round(age / 1000 / 60)} minutes`
      );
      return parsed;
    }

    console.warn("[Cache] Invalid cached content format:", url);
    await redis.del(cacheKey);
    return null;
  } catch (error) {
    console.error("[Cache] Retrieval error:", error);
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
      console.error("[Cache] Attempted to cache invalid content format");
      return;
    }

    const serialized = JSON.stringify(content);

    if (serialized.length > MAX_CACHE_SIZE) {
      console.warn(
        `[Cache] Content too large to cache for URL: ${url} (${serialized.length} bytes)`
      );
      return;
    }

    await redis.set(cacheKey, serialized, { ex: CACHE_TTL });
    console.log(
      `[Cache] Successfully cached content for: ${url} (${serialized.length} bytes, TTL: ${CACHE_TTL}s)`
    );
  } catch (error) {
    console.error("[Cache] Storage error:", error);
  }
}

// Function to scrape content from a URL using Puppeteer + Cheerio
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Check cache first
    console.log(`[Scraper] Starting scrape process for: ${url}`);
    const cached = await getCachedContent(url);
    if (cached) {
      console.log(`[Scraper] Using cached content for: ${url}`);
      return cached;
    }
    console.log(
      `[Scraper] Cache miss - proceeding with fresh scrape for: ${url}`
    );

    let browser: puppeteer.Browser | null = null;
    try {
      // Launch puppeteer browser with optimized settings
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
          "--window-size=1920x1080",
        ],
      });

      const page = await browser.newPage();

      // Optimize page settings
      await page.setRequestInterception(true);
      page.on("request", req => {
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

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      // Navigate with reduced wait time
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      // Get the HTML content directly from the page
      const html = await page.content();
      const $ = cheerio.load(html);

      // Remove unnecessary elements in one go
      $("script, style, noscript, iframe").remove();

      // Extract content efficiently
      const title = $("title").text() || "";
      const metaDescription =
        $('meta[name="description"]').attr("content") || "";

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

      return scrapedContent;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    const errorContent: ScrapedContent = {
      url,
      title: "",
      headings: { h1: "", h2: "" },
      metaDescription: "",
      content: "",
      error: "Failed to scrape URL",
    };
    return errorContent;
  }
}
