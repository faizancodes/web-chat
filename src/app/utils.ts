import { MessageSegment } from "./types";

// Utility function to detect URLs and split content into segments
export const parseMessageContent = (content: string): MessageSegment[] => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;
  const segments: MessageSegment[] = [];

  tempDiv.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.replace(/&nbsp;/g, " ").trim();
      if (text) {
        segments.push({ type: "text", content: text });
      }
    } else if (
      node instanceof HTMLSpanElement &&
      node.classList.contains("url-chip")
    ) {
      segments.push({ type: "url", content: node.textContent || "" });
    }
  });

  return segments;
};

// Add URL detection utility function
export const detectURLs = (text: string): MessageSegment[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const segments: MessageSegment[] = [];
  let lastIndex = 0;

  const matches = Array.from(text.matchAll(urlRegex));

  if (matches.length === 0) {
    return [{ type: "text", content: text }];
  }

  matches.forEach(match => {
    const url = match[0];
    const index = match.index!;

    // Add text before URL if exists
    if (index > lastIndex) {
      const textContent = text.slice(lastIndex, index);
      if (textContent.trim()) {
        segments.push({ type: "text", content: textContent });
      }
    }

    // Add URL
    segments.push({ type: "url", content: url });
    lastIndex = index + url.length;
  });

  // Add remaining text after last URL if exists
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      segments.push({ type: "text", content: remainingText });
    }
  }

  return segments;
};
