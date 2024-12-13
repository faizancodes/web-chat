import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { Logger } from "./utils/logger";

const logger = new Logger("middleware");

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60; // 1 minute window for serverless functions
const MAX_REQUESTS = 15; // maximum requests per window

// Helper function to get real IP
function getSecureClientIP(request: NextRequest): string {
  // Vercel-specific headers first
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor && isValidIP(vercelForwardedFor)) {
    return vercelForwardedFor;
  }

  // Vercel proxied IP
  const vercelIP = request.headers.get("x-vercel-ip");
  if (vercelIP && isValidIP(vercelIP)) {
    return vercelIP;
  }

  // Cloudflare headers (if using Cloudflare with Vercel)
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP && isValidIP(cfIP)) {
    return cfIP;
  }

  // Standard headers as fallback
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map(ip => ip.trim());
    if (ips[0] && isValidIP(ips[0])) return ips[0];
  }

  // Last resort: real IP
  const realIP = request.headers.get("x-real-ip");
  if (realIP && isValidIP(realIP)) return realIP;

  return "unknown";
}

// Validate IP address format
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// Create a secure rate limit key
async function createRateLimitKey(
  ip: string,
  pathname: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(
    `${ip}:${pathname}:${process.env.RATE_LIMIT_SECRET || ""}`
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `rate_limit:${hashHex}`;
}

export async function middleware(request: NextRequest) {
  try {
    const ip = getSecureClientIP(request);
    const pathname = request.nextUrl.pathname;

    logger.info(`Processing request from ${ip} to ${pathname}`);

    // Skip rate limiting for static assets
    if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
      logger.debug(`Skipping rate limit for static asset: ${pathname}`);
      return NextResponse.next();
    }

    // Special check for chat-handler route
    if (pathname === "/api/chat-handler") {
      const sessionCookie = request.cookies.get("session");
      console.log("COOKIE", sessionCookie);
      if (!sessionCookie) {
        logger.warn(
          `Missing session cookie for chat-handler request from IP: ${ip}`
        );
        return new NextResponse(null, {
          status: 401,
          statusText: "Unauthorized - Missing session cookie",
        });
      }
      logger.debug("Session cookie verified for chat-handler");
    }
    // Allow session route without API key
    else if (pathname === "/api/auth/session") {
      logger.debug("Allowing session initialization request");
      return NextResponse.next();
    }
    // Verify API key for other API routes
    else if (pathname.startsWith("/api/")) {
      const apiKey = request.headers.get("x-api-key");

      if (!apiKey || apiKey !== process.env.API_KEY) {
        logger.warn(
          `Invalid or missing API key for IP: ${ip}, Path: ${pathname}`
        );
        return new NextResponse(null, {
          status: 401,
          statusText: "Unauthorized",
        });
      }

      logger.debug("API key verified successfully");
    }

    // Check rate limit
    const key = await createRateLimitKey(ip, pathname);
    const count = await redis.get(key);

    logger.debug(
      `Rate limit check - IP: ${ip}, Path: ${pathname}, Current count: ${count}`
    );

    // Check normal limit
    if (count !== null && parseInt(count as string) >= MAX_REQUESTS) {
      logger.warn(`Rate limit exceeded for IP: ${ip}, Path: ${pathname}`);
      return new NextResponse(null, {
        status: 429,
        headers: {
          "Retry-After": RATE_LIMIT_WINDOW.toString(),
          "X-RateLimit-Limit": MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": (
            Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW
          ).toString(),
        },
      });
    }

    // Update counter
    if (count === null) {
      await redis.setex(key, RATE_LIMIT_WINDOW, 1);
      logger.debug(`Initialized rate limit counter for ${key}`);
    } else {
      await redis.incr(key);
      logger.debug(`Incremented rate limit counter for ${key}`);
    }

    // Set security headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-middleware-cache", "no-cache");
    requestHeaders.set("X-Content-Type-Options", "nosniff");
    requestHeaders.set("X-Frame-Options", "DENY");
    requestHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    // Add Vercel-specific security headers
    requestHeaders.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );
    requestHeaders.set("X-DNS-Prefetch-Control", "off");

    logger.debug("Security headers set successfully");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    logger.error("Middleware error occurred", {
      error: error instanceof Error ? error.message : String(error),
    });

    return new NextResponse(null, {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
