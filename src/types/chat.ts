export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface AzureFoundryResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DatasetSearchQuery {
  query: string;
  maxResults?: number;
  threshold?: number;
}

export interface SearchResult {
  datasetId: string;
  title: string;
  description: string;
  relevanceScore: number;
  metadata: {
    conceptSchemeId: string;
    dataflowIdentifier?: string;
    lastUpdated?: string;
    tags?: string[];
  };
}

export interface ChatContextState {
  currentQuery: string;
  searchResults: SearchResult[];
  selectedDataset: string | null;
  conversationHistory: ChatMessage[];
}