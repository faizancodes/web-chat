export type Message = {
  role: "user" | "ai";
  content: string;
};

export type MessageSegment = {
  type: "text" | "url";
  content: string;
};

export type Chip = {
  text: string;
  url: string;
};

export type ChatThread = {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messages: Message[];
};
