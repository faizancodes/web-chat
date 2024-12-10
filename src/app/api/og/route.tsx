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
    const preview = conversation.data?.messages
      ?.slice(0, 2)
      ?.map((msg: Message) => msg.content)
      ?.join(" - ")
      ?.slice(0, 150);

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
          <p
            style={{
              fontSize: 30,
              textAlign: "center",
              opacity: 0.8,
              maxWidth: "80%",
              marginTop: "20px",
            }}
          >
            {preview}...
          </p>
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
