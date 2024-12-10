const { join } = require('path');

/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  // In production, we'll use the Chrome binary from @sparticuz/chromium-min
  // In development, we'll use the default cache directory
  cacheDirectory:
    process.env.NODE_ENV !== "development"
      ? "/tmp/puppeteer-cache"
      : join(__dirname, "node_modules", ".puppeteer_cache"),
  // Ensure we're not trying to use the default executable path
  executablePath:
    process.env.NODE_ENV !== "development" ? null : undefined,
};
