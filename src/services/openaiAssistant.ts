import axios from "axios";
import type {
  DatasetSearchQuery,
  SearchResult,
  FunctionCall,
  SuggestDatasetsArguments,
  QueryAbsDataArguments,
} from "../types/chat";

class OpenAIAssistantService {
  private isConfiguredValue: boolean;

  constructor() {
    this.isConfiguredValue = true; // Always configured now using server-side API
  }

  async searchDatasets(query: DatasetSearchQuery): Promise<SearchResult[]> {
    try {
      console.log("Starting dataset search for query:", query.query);

      const response = await axios.post('/api/search', {
        query: query.query
      });

      return response.data.results || [];
    } catch (error) {
      console.error("Error searching datasets:", error);
      
      if (error instanceof Error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      throw new Error("Failed to search datasets. Please check your configuration.");
    }
  }

  async getChatResponse(
    messages: { role: string; content: string }[]
  ): Promise<string> {
    try {
      const response = await axios.post('/api/chat', {
        messages: messages
      });

      return response.data.response || "I apologize, but I was unable to generate a response. Please try rephrasing your question.";
    } catch (error) {
      console.error("Error getting chat response:", error);
      throw new Error("Failed to get response from AI assistant");
    }
  }


  isConfigured(): boolean {
    return this.isConfiguredValue;
  }
}

export const openaiAssistantService = new OpenAIAssistantService();
export default openaiAssistantService;
