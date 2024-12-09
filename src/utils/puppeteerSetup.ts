import { Browser } from "puppeteer";
import { Browser as CoreBrowser } from "puppeteer-core";
import { existsSync } from "fs";
import { Logger } from "./logger";

const logger = new Logger("puppeteerSetup");

export interface PuppeteerBrowserOptions {
  headless?: boolean | "new";
  timeout?: number;
  customArgs?: string[];
}

export async function initializePuppeteer(
  options: PuppeteerBrowserOptions = {}
): Promise<Browser | CoreBrowser> {
  try {
    logger.info("Initializing Puppeteer");
    const puppeteer = await import("puppeteer");

    // Try different possible Chrome/Chromium paths
    const possiblePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/opt/homebrew/bin/chromium",
      "/usr/bin/google-chrome",
    ];

    logger.info(
      `Checking for browser installations in ${possiblePaths.length} possible locations`
    );
    const chromePath = possiblePaths.find(path => {
      const exists = existsSync(path);
      logger.debug(
        `Checking path: ${path} - ${exists ? "Found" : "Not found"}`
      );
      if (exists) {
        logger.info(`Found browser at: ${path}`);
      }
      return exists;
    });

    const launchOptions: any = {
      headless: options.headless ?? "new",
      timeout: options.timeout ?? 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        ...(options.customArgs ?? []),
      ],
    };

    if (chromePath) {
      logger.info(`Using browser at path: ${chromePath}`);
      launchOptions.executablePath = chromePath;
    } else {
      logger.info("Using bundled Chromium");
    }

    logger.info(
      "Attempting to launch browser with options:",
      JSON.stringify(launchOptions, null, 2)
    );
    const browser = await puppeteer.launch(launchOptions);
    logger.info("Browser launched successfully");

    return browser;
  } catch (error) {
    logger.error(`Error initializing Puppeteer: ${error}`);
    throw error;
  }
}

export async function createNewPage(browser: Browser | CoreBrowser) {
  const page = await browser.newPage();
  logger.info("New page created");

  logger.info("Setting custom user agent");
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  return page;
}
