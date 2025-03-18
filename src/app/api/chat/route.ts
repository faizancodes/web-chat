        } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error("Error in background processing:", {
          error,
          processingTimeMs: processingTime,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "completion",
              content: `Sorry, an error occurred: ${errorMessage}`, // Send error message
              conversationId: currentConversationId, // Preserve conversation context if possible
              error: true, // Add an error flag
            })}

`
          )
        );
        await writer.close();
        return { success: false, error };
      }