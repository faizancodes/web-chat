import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Logger } from "./utils/logger";
import { env } from "./config/env";
import { redis } from "./utils/redis";

const logger = new Logger("middleware");

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60; // 1 minute window for serverless functions
const MAX_REQUESTS = 15; // maximum requests per window
const SESSION_COOKIE_NAME = "web-chat-session-id"; // Match the name in auth/session/route.ts

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

// Create a secure rate limit key based on session ID and pathname
async function createRateLimitKey(
  sessionId: string | undefined,
  pathname: string
): Promise<string> {
  // Use a more efficient approach for key generation
  const secret = env.RATE_LIMIT_SECRET;

  // If no session ID is available, use a special identifier
  const identifier = sessionId || "anonymous-user";
  const input = `${identifier}:${pathname}:${secret}`;

  // Use crypto API for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return `rate_limit:${hashHex}`;
}

// Check if a request should be rate limited
async function checkRateLimit(
  sessionId: string | undefined,
  pathname: string,
  ip: string
): Promise<{
  limited: boolean;
  headers: Record<string, string>;
}> {
  const key = await createRateLimitKey(sessionId, pathname);
  const count = await redis.get(key);

  logger.debug(
    `Rate limit check - Session: ${sessionId || "anonymous"}, IP: ${ip}, Path: ${pathname}, Current count: ${count}`
  );

  const currentCount = count !== null ? parseInt(count as string) : 0;
  const remaining = Math.max(0, MAX_REQUESTS - currentCount);
  const resetTime = Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW;

  const headers = {
    "X-RateLimit-Limit": MAX_REQUESTS.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime.toString(),
  };

  // Check if rate limit exceeded
  if (count !== null && currentCount >= MAX_REQUESTS) {
    logger.warn(
      `Rate limit exceeded for ${sessionId ? `Session: ${sessionId}` : "anonymous user"}, Path: ${pathname}`
    );
    return {
      limited: true,
      headers: {
        ...headers,
        "Retry-After": RATE_LIMIT_WINDOW.toString(),
      },
    };
  }

  // Update counter
  if (count === null) {
    await redis.setex(key, RATE_LIMIT_WINDOW, 1);
    logger.debug(`Initialized rate limit counter for ${key}`);
  } else {
    await redis.incr(key);
    logger.debug(`Incremented rate limit counter for ${key}`, {
      count: currentCount + 1,
    });
  }

  return { limited: false, headers };
}

// Set security headers for all responses
function setSecurityHeaders(requestHeaders: Headers): Headers {
  requestHeaders.set("x-middleware-cache", "no-cache");
  requestHeaders.set("X-Content-Type-Options", "nosniff");
  requestHeaders.set("X-Frame-Options", "DENY");
  requestHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  requestHeaders.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  requestHeaders.set("X-DNS-Prefetch-Control", "off");

  return requestHeaders;
}

// Check if a path is for static assets
function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith("/_next/") || pathname === "/favicon.ico";
}

export async function middleware(request: NextRequest) {
  try {
    const ip = getSecureClientIP(request);
    const pathname = request.nextUrl.pathname;

    // Get session ID from cookie for rate limiting
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    const sessionId = sessionCookie?.value;

    logger.info(
      `Processing request from ${sessionId ? "authenticated user" : "anonymous user"} (IP: ${ip}) to ${pathname}`
    );

    // Skip rate limiting for static assets
    if (isStaticAsset(pathname)) {
      logger.debug(`Skipping rate limit for static asset: ${pathname}`);
      return NextResponse.next();
    }

    // Handle different API routes
    if (pathname === "/api/chat-handler") {
      // Verify session for chat handler
      if (!sessionId) {
        logger.warn(
          `Missing session cookie for chat-handler request from IP: ${ip}`
        );
        return new NextResponse(null, {
          status: 401,
          statusText: "Unauthorized - Missing session cookie",
        });
      }

      logger.debug("Session cookie verified for chat-handler");
    } else if (pathname === "/api/auth/session") {
      // Allow session route without API key
      logger.debug("Allowing session initialization request");
      return NextResponse.next();
    } else if (pathname.startsWith("/api/")) {
      // Verify API key for other API routes
      const apiKey = request.headers.get("x-api-key");

      if (!apiKey || apiKey !== env.API_KEY) {
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

    // Apply rate limiting based on session ID
    const { limited, headers } = await checkRateLimit(sessionId, pathname, ip);

    if (limited) {
      return new NextResponse(null, {
        status: 429,
        headers,
      });
    }

    // Set security headers
    const requestHeaders = setSecurityHeaders(new Headers(request.headers));

    // Add rate limit headers to the response
    Object.entries(headers).forEach(([key, value]) => {
      requestHeaders.set(key, value);
    });

    logger.debug("Request processed successfully");

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
