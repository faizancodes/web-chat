const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

try {
  const sharedId = await createSharedConversation(conversationId, controller.signal);
} catch (error) {
  if (error.name === 'AbortError') {
    // Handle timeout
  }
}