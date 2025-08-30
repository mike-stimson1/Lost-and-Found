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

export interface OpenAIAssistantResponse {
  id: string;
  object: string;
  created_at: number;
  assistant_id: string;
  thread_id: string;
  run_id: string;
  role: string;
  content: {
    type: string;
    text: {
      value: string;
      annotations: unknown[];
    };
  }[];
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
    dataKey?: string;
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

export interface DatasetSuggestion {
  id: string;
  description: string;
}

export interface FunctionCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: QueryAbsDataArguments | SuggestDatasetsArguments;
  };
}

export interface QueryAbsDataArguments {
  dataflow_identifier: string;
  data_key: string;
  repeat_count: number;
}

export interface SuggestDatasetsArguments {
  datasets: DatasetSuggestion[];
}