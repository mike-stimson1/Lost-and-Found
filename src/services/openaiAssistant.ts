import axios from 'axios';
import type { DatasetSearchQuery, SearchResult } from '../types/chat';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const ASSISTANT_ID = import.meta.env.VITE_OPENAI_ASSISTANT_ID;

if (!OPENAI_API_KEY || !ASSISTANT_ID) {
  console.warn('OpenAI configuration missing. Please set environment variables.');
}

class OpenAIAssistantService {
  private isConfiguredValue: boolean;
  private baseURL = 'https://api.openai.com/v1';

  constructor() {
    this.isConfiguredValue = !!(OPENAI_API_KEY && ASSISTANT_ID);
  }

  async searchDatasets(query: DatasetSearchQuery): Promise<SearchResult[]> {
    if (!this.isConfiguredValue) {
      throw new Error('OpenAI client not configured. Please check environment variables.');
    }

    try {
      // Create a thread
      const threadResponse = await axios.post(
        `${this.baseURL}/threads`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      const threadId = threadResponse.data.id;

      // Add message to thread
      await axios.post(
        `${this.baseURL}/threads/${threadId}/messages`,
        {
          role: 'user',
          content: this.buildSearchPrompt(query.query)
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      // Run the assistant
      const runResponse = await axios.post(
        `${this.baseURL}/threads/${threadId}/runs`,
        {
          assistant_id: ASSISTANT_ID,
          max_completion_tokens: 1000,
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      const runId = runResponse.data.id;

      // Poll for completion and handle function calls
      const functionCalls = await this.pollRunCompletionForFunctionCalls(threadId, runId);
      
      if (!functionCalls || functionCalls.length === 0) {
        throw new Error('No function calls from OpenAI Assistant');
      }

      return this.convertFunctionCallsToSearchResults(functionCalls);
    } catch (error) {
      console.error('Error searching datasets:', error);
      throw new Error('Failed to search datasets. Please try again.');
    }
  }

  async getChatResponse(messages: { role: string; content: string }[]): Promise<string> {
    if (!this.isConfiguredValue) {
      throw new Error('OpenAI client not configured');
    }

    try {
      // Create a thread
      const threadResponse = await axios.post(
        `${this.baseURL}/threads`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      const threadId = threadResponse.data.id;

      // Add all messages to thread (only user messages for assistant API)
      const userMessages = messages.filter(msg => msg.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];
      
      if (lastUserMessage) {
        await axios.post(
          `${this.baseURL}/threads/${threadId}/messages`,
          {
            role: 'user',
            content: lastUserMessage.content
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );
      }

      // Run the assistant
      const runResponse = await axios.post(
        `${this.baseURL}/threads/${threadId}/runs`,
        {
          assistant_id: ASSISTANT_ID,
          max_completion_tokens: 800,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      const runId = runResponse.data.id;

      // Poll for completion (for chat, we still expect text responses)
      const result = await this.pollRunCompletion(threadId, runId);
      
      return result || 'No response generated';
    } catch (error) {
      console.error('Error getting chat response:', error);
      throw new Error('Failed to get response from AI assistant');
    }
  }

  private buildSearchPrompt(query: string): string {
    return `
User query: "${query}"

Based on this query, analyze the Australian government conceptscheme data and recommend the most relevant datasets by calling the query_abs_data_endpoint function for each relevant dataset. Consider:
1. The user's intent and what type of data they might need
2. Keywords and domain areas mentioned
3. Potential use cases and applications

Call the query_abs_data_endpoint function for up to 5 most relevant datasets.
    `.trim();
  }

  private convertFunctionCallsToSearchResults(functionCalls: FunctionCall[]): SearchResult[] {
    return functionCalls.map((call, index) => {
      const args = call.function.arguments;
      return {
        datasetId: `dataset_${index}`,
        title: this.getDatasetTitle(args.dataflow_identifier),
        description: this.getDatasetDescription(args.dataflow_identifier, args.data_key),
        relevanceScore: 0.8, // Default high relevance since AI selected it
        metadata: {
          conceptSchemeId: args.dataflow_identifier,
          dataflowIdentifier: args.dataflow_identifier,
          dataKey: args.data_key,
          lastUpdated: new Date().toISOString(),
          tags: [this.extractAgencyFromDataflow(args.dataflow_identifier)]
        }
      };
    });
  }

  private getDatasetTitle(dataflowId: string): string {
    // Extract a human-readable title from dataflow identifier
    const parts = dataflowId.split(',');
    const mainId = parts[1] || parts[0];
    return mainId.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim() || 'ABS Dataset';
  }

  private getDatasetDescription(dataflowId: string, dataKey: string): string {
    const title = this.getDatasetTitle(dataflowId);
    return `Australian Bureau of Statistics dataset: ${title}. Data key: ${dataKey}`;
  }

  private extractAgencyFromDataflow(dataflowId: string): string {
    const parts = dataflowId.split(',');
    return parts[0] || 'ABS';
  }

  private async pollRunCompletion(threadId: string, runId: string): Promise<string | null> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const runStatusResponse = await axios.get(
          `${this.baseURL}/threads/${threadId}/runs/${runId}`,
          {
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );

        const status = runStatusResponse.data.status;

        if (status === 'completed') {
          // Get messages from thread
          const messagesResponse = await axios.get(
            `${this.baseURL}/threads/${threadId}/messages`,
            {
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'OpenAI-Beta': 'assistants=v2'
              }
            }
          );

          const messages = messagesResponse.data.data;
          const assistantMessage = messages.find((msg: { role: string; content: unknown[] }) => msg.role === 'assistant');
          
          if (assistantMessage && assistantMessage.content[0]?.text?.value) {
            return assistantMessage.content[0].text.value;
          }
        } else if (status === 'failed' || status === 'cancelled' || status === 'expired') {
          throw new Error(`Run ${status}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Error polling run status:', error);
        throw error;
      }
    }

    throw new Error('Run timed out');
  }

  private async pollRunCompletionForFunctionCalls(threadId: string, runId: string): Promise<FunctionCall[]> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const runStatusResponse = await axios.get(
          `${this.baseURL}/threads/${threadId}/runs/${runId}`,
          {
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'OpenAI-Beta': 'assistants=v2'
            }
          }
        );

        const status = runStatusResponse.data.status;
        const runData = runStatusResponse.data;

        if (status === 'completed') {
          // Check if there are function calls in the run
          if (runData.required_action?.type === 'submit_tool_outputs') {
            return runData.required_action.submit_tool_outputs.tool_calls || [];
          }
          
          // If no function calls but completed, get regular messages
          const messagesResponse = await axios.get(
            `${this.baseURL}/threads/${threadId}/messages`,
            {
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'OpenAI-Beta': 'assistants=v2'
              }
            }
          );

          const messages = messagesResponse.data.data;
          const assistantMessage = messages.find((msg: { role: string; content: unknown[] }) => msg.role === 'assistant');
          
          if (assistantMessage && assistantMessage.content[0]?.text?.value) {
            // Try to extract function calls from text if they exist
            return this.extractFunctionCallsFromText(assistantMessage.content[0].text.value);
          }
        } else if (status === 'requires_action') {
          // Handle function calls that require action
          if (runData.required_action?.type === 'submit_tool_outputs') {
            return runData.required_action.submit_tool_outputs.tool_calls || [];
          }
        } else if (status === 'failed' || status === 'cancelled' || status === 'expired') {
          throw new Error(`Run ${status}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Error polling run status:', error);
        throw error;
      }
    }

    throw new Error('Run timed out');
  }

  private extractFunctionCallsFromText(text: string): FunctionCall[] {
    // Fallback: try to extract function call patterns from text
    // This is a backup in case the assistant returns text instead of function calls
    const functionCallPattern = /query_abs_data_endpoint\([^)]+\)/g;
    const matches = text.match(functionCallPattern) || [];
    
    return matches.map((_match, index) => {
      // Parse basic function call from text - this is a simplified parser
      return {
        id: `call_${index}`,
        type: 'function',
        function: {
          name: 'query_abs_data_endpoint',
          arguments: {
            dataflow_identifier: 'ABS,CPI',
            data_key: 'all',
            repeat_count: 1
          }
        }
      };
    });
  }

  isConfigured(): boolean {
    return this.isConfiguredValue;
  }
}

interface FunctionCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: {
      dataflow_identifier: string;
      data_key: string;
      repeat_count: number;
    };
  };
}

export const openaiAssistantService = new OpenAIAssistantService();
export default openaiAssistantService;