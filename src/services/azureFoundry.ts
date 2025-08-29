import axios from 'axios';
import type { DatasetSearchQuery, SearchResult } from '../types/chat';

const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const AZURE_API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const DEPLOYMENT_NAME = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME;

if (!AZURE_ENDPOINT || !AZURE_API_KEY || !DEPLOYMENT_NAME) {
  console.warn('Azure OpenAI configuration missing. Please set environment variables.');
}

class AzureFoundryService {
  private isConfiguredValue: boolean;

  constructor() {
    this.isConfiguredValue = !!(AZURE_ENDPOINT && AZURE_API_KEY && DEPLOYMENT_NAME);
  }

  async searchDatasets(query: DatasetSearchQuery): Promise<SearchResult[]> {
    if (!this.isConfiguredValue) {
      throw new Error('Azure OpenAI client not configured. Please check environment variables.');
    }

    const searchPrompt = this.buildSearchPrompt(query.query);

    try {
      const response = await axios.post(
        `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-15-preview`,
        {
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing Australian government datasets. Based on the user query, recommend relevant datasets from the conceptscheme data. Return your response as a JSON array of dataset recommendations with id, name, description, relevanceScore (0-1), and dataflowIdentifier.'
            },
            {
              role: 'user',
              content: searchPrompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_API_KEY
          }
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Azure OpenAI');
      }

      return this.parseSearchResults(content);
    } catch (error) {
      console.error('Error searching datasets:', error);
      throw new Error('Failed to search datasets. Please try again.');
    }
  }

  async getChatResponse(messages: { role: string; content: string }[]): Promise<string> {
    if (!this.isConfiguredValue) {
      throw new Error('Azure OpenAI client not configured');
    }

    try {
      const response = await axios.post(
        `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-15-preview`,
        {
          messages,
          max_tokens: 800,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_API_KEY
          }
        }
      );

      return response.data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Error getting chat response:', error);
      throw new Error('Failed to get response from AI assistant');
    }
  }

  private buildSearchPrompt(query: string): string {
    return `
User query: "${query}"

Based on this query, analyze the Australian government conceptscheme data and recommend the most relevant datasets. Consider:
1. The user's intent and what type of data they might need
2. Keywords and domain areas mentioned
3. Potential use cases and applications

Please recommend up to 5 most relevant datasets with explanations of why they match the query.
    `.trim();
  }

  private parseSearchResults(content: string): SearchResult[] {
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const results = JSON.parse(cleanContent);
      
      if (Array.isArray(results)) {
        return results.map((result: any, index: number) => ({
          datasetId: result.id || `dataset_${index}`,
          title: result.name || result.title || 'Untitled Dataset',
          description: result.description || 'No description available',
          relevanceScore: result.relevanceScore || 0.5,
          metadata: {
            conceptSchemeId: result.conceptSchemeId || result.id || '',
            dataflowIdentifier: result.dataflowIdentifier || '',
            lastUpdated: new Date().toISOString(),
            tags: result.tags || []
          }
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error parsing search results:', error);
      return [
        {
          datasetId: 'example_1',
          title: 'Sample Dataset',
          description: 'Unable to parse AI response. This is a fallback example.',
          relevanceScore: 0.5,
          metadata: {
            conceptSchemeId: 'CS_EXAMPLE',
            dataflowIdentifier: 'EXAMPLE_DF',
            lastUpdated: new Date().toISOString(),
            tags: ['example']
          }
        }
      ];
    }
  }

  isConfigured(): boolean {
    return this.isConfiguredValue;
  }
}

export const azureFoundryService = new AzureFoundryService();
export default azureFoundryService;