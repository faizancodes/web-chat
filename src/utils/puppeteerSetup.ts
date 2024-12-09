import { existsSync } from "fs";
import { Logger } from "./logger";

const logger = new Logger("puppeteerSetup");

export const getPuppeteerOptions = () => {
  // Try different possible Chrome/Chromium paths
  const possiblePaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // System Chrome
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/opt/homebrew/bin/chromium",
    "/usr/bin/google-chrome",
  ];

  logger.info(
    `Checking for browser installations in ${possiblePaths.length} possible locations`
  );
  const chromePath = possiblePaths.find(path => {
    const exists = existsSync(path);
    logger.debug(`Checking path: ${path} - ${exists ? "Found" : "Not found"}`);
    if (exists) {
      logger.info(`Found browser at: ${path}`);
    }
    return exists;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const launchOptions: any = {
    headless: "new", // Use new headless mode
    timeout: 60000, // Increase timeout to 60 seconds
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  };

  if (chromePath) {
    logger.info(`Using browser at path: ${chromePath}`);
    launchOptions.executablePath = chromePath;
  } else {
    logger.info("Using bundled Chromium");
  }

  logger.info(
    "Returning launch options:",
    JSON.stringify(launchOptions, null, 2)
  );

  return launchOptions;
};
