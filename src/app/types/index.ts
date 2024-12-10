export interface Message {
  role: "user" | "ai";
  content: string;
}

export interface SearchResult {
  title: string;
  link: string;
  source: string;
}

export interface ConversationLoaderProps {
  onConversationLoad: (messages: Message[], id: string | null) => void;
}

export interface HeaderProps {
  onNewConversation?: () => void;
}

export interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  searchStatus: string;
  searchResults: SearchResult[];
}

export interface InputAreaProps {
  onSend: (message: string) => Promise<void>;
  isLoading: boolean;
  initialChips: Array<{
    text: string;
    url: string;
  }>;
}

export interface RateLimitBannerProps {
  retryAfter: number;
}
