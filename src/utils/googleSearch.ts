import { Browser } from "puppeteer";
import { Logger } from "./logger";
import { Browser as CoreBrowser } from "puppeteer-core";
import { scrapeUrl, ScrapedContent } from "./scraper";
import { getPuppeteerOptions } from "./puppeteerSetup";
const logger = new Logger("googleSearch");

export interface GoogleSearchResult {
  title: string;
  link: string;
  description: string;
  thumbnail: string;
  source: string;
}

export async function searchGoogle(
  query: string,
  numResults: number = 5
): Promise<GoogleSearchResult[]> {
  let browser: Browser | CoreBrowser | null = null;
  const results: GoogleSearchResult[] = [];

  try {
    logger.info(
      `Starting Google search for query: "${query}" with ${numResults} requested results`
    );

    const puppeteer = await import("puppeteer");
    logger.info("Puppeteer imported successfully");

    const launchOptions = await getPuppeteerOptions();
    browser = await puppeteer.launch(launchOptions);
    logger.info("Browser launched successfully");
    const page = await browser.newPage();

    // Navigate to Google and perform search
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    logger.info(`Navigating to Google search URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });
    logger.info("Navigation complete, page loaded");

    // Extract search results
    logger.info("Starting search results extraction");
    const searchResults = await page.evaluate((maxResults: number) => {
      const items = Array.from(document.querySelectorAll("div.g"));
      return items.slice(0, maxResults).map(item => {
        const title = item.querySelector("h3")?.textContent || "";
        const link = item.querySelector("a")?.href || "";
        const description = item.querySelector("div.VwiC3b")?.textContent || "";

        // Try multiple selectors for thumbnail images
        let thumbnail = "";
        const imgElement = item.querySelector("g-img img, img.T3HQGc");
        if (imgElement) {
          thumbnail = imgElement.getAttribute("src") || "";
        }

        // Get the website name (source)
        let source = "";
        const sourceElement = item.querySelector("span.VuuXrf");
        if (sourceElement && sourceElement.textContent) {
          source = sourceElement.textContent.trim();
        } else {
          const citeElement = item.querySelector("cite.qLRx3b");
          if (citeElement) {
            const citeText = citeElement.textContent || "";
            const match = citeText.match(
              /^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i
            );
            source = match ? match[1].trim() : citeText.trim();
          }
        }

        return {
          title,
          link,
          description,
          thumbnail,
          source,
        };
      });
    }, numResults);

    logger.info(
      `Page evaluation complete. Found ${searchResults.length} results`
    );

    // Log details about each result
    searchResults.forEach((result, index) => {
      logger.debug(`Result ${index + 1}:
          Title: ${result.title.substring(0, 50)}${result.title.length > 50 ? "..." : ""}
          Link: ${result.link}
          Has thumbnail: ${result.thumbnail ? "Yes" : "No"}
          Source: ${result.source}`);
    });

    results.push(...searchResults);
    logger.info(
      `Successfully processed ${results.length} search results for query: "${query}"`
    );

    return results;
  } catch (error) {
    logger.error(
      `Error performing Google search for query "${query}": ${error}`
    );
    logger.error(`Error stack: ${(error as Error).stack}`);
    throw error;
  } finally {
    if (browser) {
      try {
        logger.info("Attempting to close browser");
        await browser.close();
        logger.info("Browser closed successfully");
      } catch (closeError) {
        logger.error(`Error closing browser: ${closeError}`);
      }
    }
  }
}

export async function scrapeGoogleSearchResults(
  results: GoogleSearchResult[]
): Promise<ScrapedContent[]> {
  logger.info(`Starting to scrape ${results.length} Google search results`);
  const scrapedResults = await Promise.all(
    results.map(async (result, index) => {
      logger.info(
        `Scraping result ${index + 1}/${results.length}: ${result.link}`
      );
      try {
        const scrapedContent = await scrapeUrl(result.link);
        logger.info(`Successfully scraped content from ${result.link}`);
        return scrapedContent;
      } catch (error) {
        logger.error(`Failed to scrape ${result.link}: ${error}`);
        throw error;
      }
    })
  );
  logger.info(`Completed scraping ${results.length} results`);
  return scrapedResults;
}

export async function getGoogleSearchResults(
  query: string,
  numResults: number = 5
): Promise<ScrapedContent[]> {
  logger.info(
    `Starting combined search and scrape process for query: "${query}"`
  );
  const searchResults = await searchGoogle(query, numResults);
  logger.info(
    `Retrieved ${searchResults.length} search results, proceeding to scrape`
  );
  const scrapedResults = await scrapeGoogleSearchResults(searchResults);
  logger.info(`Completed search and scrape process for query: "${query}"`);
  return scrapedResults;
}
