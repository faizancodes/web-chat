import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { storeSession, getSession } from "@/utils/redis";
import { Logger } from "@/utils/logger";

const logger = new Logger("session-route");

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (sessionCookie) {
      // Validate the existing session
      if (!isValidSessionId(sessionCookie.value)) {
        logger.warn(`Invalid session ID format: ${sessionCookie.value}`);
        return createNewSession();
      }

      // Check if session exists in Redis
      const sessionData = await getSession(sessionCookie.value);
      if (!sessionData) {
        logger.info(`Session not found in Redis: ${sessionCookie.value}`);
        return createNewSession();
      }

      return NextResponse.json({ 
        status: "ok", 
        message: "existing session",
        sessionId: sessionCookie.value,
        data: sessionData
      });
    }

    return createNewSession();
  } catch (error) {
    logger.error("Session handling error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to handle session" },
      { status: 500 }
    );
  }
}

async function createNewSession() {
  const sessionId = crypto.randomBytes(32).toString("hex");
  
  // Store session in Redis
  const success = await storeSession(sessionId, {
    created: new Date().toISOString()
  });

  if (!success) {
    logger.error("Failed to store session in Redis");
    return NextResponse.json(
      { status: "error", message: "Failed to create session" },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ 
    status: "ok", 
    message: "session created",
    sessionId 
  });
  
  response.cookies.set({
    name: "session",
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    path: "/",
    maxAge: 1 * 24 * 60 * 60, // 1 day
  });

  return response;
}

function isValidSessionId(sessionId: string): boolean {
  return /^[a-f0-9]{64}$/.test(sessionId);
}
