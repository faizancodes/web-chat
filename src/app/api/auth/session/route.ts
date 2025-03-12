import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const SESSION_COOKIE = "web-chat-session-id";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function GET() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    sessionId = uuidv4();
    // Set cookie with 7 day expiry
    cookieStore.set(SESSION_COOKIE, sessionId, {
      expires: new Date(Date.now() + SESSION_DURATION),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  }

  return Response.json({ sessionId });
}
