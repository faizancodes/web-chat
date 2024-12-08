const { join } = require('path');

/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  // In production, we'll use the Chrome binary from @sparticuz/chromium-min
  // In development, we'll use the default cache directory
  cacheDirectory: process.env.NODE_ENV === 'production' 
    ? '/tmp' 
    : join(__dirname, 'node_modules', '.puppeteer_cache'),
}; 