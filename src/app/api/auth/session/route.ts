import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const cookieStore = await cookies();

  // Check if session already exists
  if (cookieStore.get("session")) {
    return NextResponse.json({ status: "existing session" });
  }

  // Create a new session ID
  const sessionId = crypto.randomBytes(32).toString("hex");

  // Set the cookie
  const response = NextResponse.json({ status: "session created" });
  response.cookies.set({
    name: "session",
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    path: "/",
    // 7 days expiry
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
