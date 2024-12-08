import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

// URL regex pattern that matches http/https URLs
export const urlPattern =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

// Function to clean text content
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
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
}

// Function to scrape content from a URL using Puppeteer + Cheerio
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  let browser: puppeteer.Browser | null = null;

  try {
    // Launch puppeteer browser with optimized settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });

    const page = await browser.newPage();

    // Optimize page settings
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'media') {
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
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Get the HTML content directly from the page
    const html = await page.content();
    const $ = cheerio.load(html);

    // Remove unnecessary elements in one go
    $("script, style, noscript, iframe").remove();

    // Extract content efficiently
    const title = $("title").text() || "";
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    
    // Enhanced heading extraction
    const headings = {
      h1: $("h1").map((_, el) => $(el).text().trim()).get().join(" "),
      h2: $("h2").map((_, el) => $(el).text().trim()).get().join(" ")
    };

    // Enhanced content extraction
    const textSelectors = [
      'p',          // paragraphs
      'li',         // list items
      'td',         // table cells
      'th',         // table headers
      'blockquote', // quotes
      'article',    // article text
      'span',       // inline text
      'div',        // div text
      'h3',         // additional headings
      'h4',
      'h5',
      'h6'
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

    const combinedContent = cleanText([title, metaDescription, headings.h1, headings.h2, bodyContent].join(" ")).slice(0, 40000);

    return {
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
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
