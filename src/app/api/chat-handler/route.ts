import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { Logger } from "@/utils/logger";
import { cookies } from "next/headers";
import { 
  verifyConversationAccess, 
  checkConversationRateLimit,
  associateConversationWithSession,
  saveConversation
} from "@/utils/redis";

const logger = new Logger("api/chat-handler");
const API_KEY = env.API_KEY;
const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api/chat"
    : "https://www.webchat.so/api/chat";

export async function POST(request: Request) {
  try {
    const requestId = Math.random().toString(36).substring(7);
    logger.info(`Received chat request [${requestId}]`);
    
    // 1. Get session ID from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (!sessionCookie?.value) {
      logger.warn(`No session cookie found [${requestId}]`);
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    // 2. Get request body
    const body = await request.json();
    logger.debug(`Request body [${requestId}]:`, { 
      hasMessage: !!body.message,
      conversationId: body.conversationId || 'new',
      sessionId: sessionCookie.value
    });

    if (!body.message) {
      logger.warn(`Request missing required message field [${requestId}]`);
      return NextResponse.json(
        { error: "Bad request: message is required" },
        { status: 400 }
      );
    }

    // 3. Handle conversation access
    if (body.conversationId) {
      logger.debug(`Verifying access for existing conversation [${requestId}]`, {
        conversationId: body.conversationId,
        sessionId: sessionCookie.value
      });

      const hasAccess = await verifyConversationAccess(
        body.conversationId,
        sessionCookie.value
      );
      
      if (!hasAccess) {
        logger.warn(`Unauthorized access attempt [${requestId}]`, {
          conversationId: body.conversationId,
          sessionId: sessionCookie.value
        });
        return NextResponse.json(
          { error: "Unauthorized: Invalid conversation access" },
          { status: 403 }
        );
      }
    } else {
      logger.debug(`Checking rate limit for new conversation [${requestId}]`);
      const withinLimit = await checkConversationRateLimit(sessionCookie.value);
      if (!withinLimit) {
        logger.warn(`Rate limit exceeded [${requestId}]`, {
          sessionId: sessionCookie.value
        });
        return NextResponse.json(
          { error: "Too many conversations created today" },
          { status: 429 }
        );
      }
    }

    // 4. Add session ID to the request body for the API
    const apiBody = {
      ...body,
      sessionId: sessionCookie.value,
      requestId // Add request ID for tracing
    };

    logger.info(`Making request to chat API [${requestId}]`, {
      conversationId: body.conversationId || 'new'
    });
    
    // 5. Make request to chat API
    const chatResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY || "",
        "x-request-id": requestId
      },
      body: JSON.stringify(apiBody),
    });

    // 6. Handle API response
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      logger.error(`Chat API request failed [${requestId}]`, {
        status: chatResponse.status,
        error: errorData,
      });
      
      return NextResponse.json(
        { error: errorData.error || "Chat API request failed" },
        { status: chatResponse.status }
      );
    }

    // 7. Check if response is streaming
    const contentType = chatResponse.headers.get("content-type");
    if (contentType?.includes("text/event-stream")) {
      logger.info(`Received streaming response [${requestId}]`);
      
      // For streaming responses, we need to handle conversation association differently
      // The conversation ID will come in the first event
      const stream = new ReadableStream({
        async start(controller) {
          const reader = chatResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const eventData = JSON.parse(line.slice(5));
                    
                    // If this is the first message and it contains a conversation ID
                    if (eventData.conversationId && !body.conversationId) {
                      logger.debug(`Associating conversation from stream [${requestId}]`, {
                        conversationId: eventData.conversationId
                      });
                      
                      // First associate the conversation
                      await associateConversationWithSession(
                        eventData.conversationId,
                        sessionCookie.value
                      );
                      
                      // Then save the conversation data
                      const messages = [...body.messages || [], { role: 'user', content: body.message }];
                      if (eventData.content) {
                        messages.push({ role: 'ai', content: eventData.content });
                      }
                      await saveConversation(eventData.conversationId, messages, sessionCookie.value);
                    }
                    
                    // If this is a completion message, update the conversation
                    if (eventData.type === 'completion' && eventData.conversationId) {
                      const messages = [...body.messages || [], 
                        { role: 'user', content: body.message },
                        { role: 'ai', content: eventData.content }
                      ];
                      await saveConversation(eventData.conversationId, messages, sessionCookie.value);
                    }
                  } catch (e) {
                    logger.error(`Error processing stream event [${requestId}]`, { error: e });
                  }
                }
                controller.enqueue(encoder.encode(line + "\n"));
              }
            }
          } catch (error) {
            logger.error(`Stream processing error [${requestId}]`, { error });
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // 8. Handle JSON response
    const responseText = await chatResponse.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      
      // 9. Associate new conversation with session if needed
      if (responseData.conversationId && !body.conversationId) {
        logger.debug(`Associating conversation from JSON response [${requestId}]`, {
          conversationId: responseData.conversationId
        });
        
        // First associate the conversation
        const associated = await associateConversationWithSession(
          responseData.conversationId,
          sessionCookie.value
        );
        
        if (!associated) {
          logger.error(`Failed to associate conversation [${requestId}]`, {
            conversationId: responseData.conversationId
          });
        } else {
          // Then save the conversation data
          const messages = [...body.messages || [], 
            { role: 'user', content: body.message }
          ];
          if (responseData.content) {
            messages.push({ role: 'ai', content: responseData.content });
          }
          await saveConversation(responseData.conversationId, messages, sessionCookie.value);
        }
      }

      logger.info(`Successfully processed chat request [${requestId}]`);
      return NextResponse.json(responseData);
    } catch (parseError) {
      logger.error(`Failed to parse API response [${requestId}]`, { 
        error: parseError, 
        responseText 
      });
      return NextResponse.json(
        { error: "Invalid response from chat API" },
        { status: 500 }
      );
    }
  } catch (error) {
    const requestId = Math.random().toString(36).substring(7);
    logger.error(`Unexpected error in chat handler [${requestId}]`, { 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error 
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
