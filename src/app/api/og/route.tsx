import { ImageResponse } from "next/og";
import { getSharedConversation } from "../actions/api-handler";
import { Message } from "@/app/types";
import { Logger } from "@/utils/logger";

const logger = new Logger("og");

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#2a2b38",
              color: "white",
              padding: "40px",
            }}
          >
            <h1 style={{ fontSize: 60, textAlign: "center", margin: 0 }}>
              WebChat Conversation
            </h1>
            <p style={{ fontSize: 30, textAlign: "center", opacity: 0.8 }}>
              Click to view the shared conversation
            </p>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    const conversation = await getSharedConversation(id);
    const messages = conversation.data?.messages || [];
    const messageCount = messages.length;
    const preview = messages
      ?.slice(0, 2)
      ?.map((msg: Message) => msg.content)
      ?.join(" - ")
      ?.slice(0, 120);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(to bottom right, #2a2b38, #1a1b28)",
            color: "white",
            padding: "60px",
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.05) 1%, transparent 1%) 0 0 / 50px 50px",
              opacity: 0.5,
            }}
          />

          {/* Content Container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
              width: "100%",
              maxWidth: "90%",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "40px",
              }}
            >
              <h1
                style={{
                  fontSize: 72,
                  fontWeight: "bold",
                  background: "linear-gradient(to right, #fff, #ccc)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  margin: 0,
                }}
              >
                WebChat
              </h1>
            </div>

            {/* Preview Text */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "30px 40px",
                borderRadius: "20px",
                width: "100%",
                maxWidth: "80%",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <p
                style={{
                  fontSize: 32,
                  lineHeight: 1.4,
                  textAlign: "center",
                  margin: 0,
                  opacity: 0.9,
                }}
              >
                {preview}...
              </p>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: "40px",
                fontSize: 24,
                opacity: 0.7,
              }}
            >
              {messageCount} messages · Click to view conversation
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    logger.error("[API] Error generating preview", { error });
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#2a2b38",
            color: "white",
          }}
        >
          <h1 style={{ fontSize: 60 }}>Error generating preview</h1>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
