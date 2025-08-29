import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import azureFoundryService from '../services/azureFoundry';
import type { ChatMessage, ChatState, SearchResult } from '../types/chat';

export const useChat = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));

    return newMessage;
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setChatState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setChatState(prev => ({ ...prev, isLoading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setChatState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const sendMessage = useCallback(async (content: string) => {
    if (chatState.isLoading || !content.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      addMessage({
        role: 'user',
        content: content.trim()
      });

      const assistantMessage = addMessage({
        role: 'assistant',
        content: '',
        isLoading: true
      });

      if (!azureFoundryService.isConfigured()) {
        updateMessage(assistantMessage.id, {
          content: 'Azure OpenAI is not configured. Please check your environment variables.\n\nFor now, I can show you some example dataset recommendations based on your query.',
          isLoading: false
        });

        const mockResults: SearchResult[] = [
          {
            datasetId: 'mock_employment',
            title: 'Employment Statistics Dataset',
            description: 'Comprehensive employment data including unemployment rates, job vacancies, and workforce participation.',
            relevanceScore: 0.85,
            metadata: {
              conceptSchemeId: 'CS_EMPLOYMENT',
              dataflowIdentifier: 'EMP_STATS',
              tags: ['employment', 'statistics', 'workforce']
            }
          },
          {
            datasetId: 'mock_demographics',
            title: 'Population Demographics',
            description: 'Demographic data including age distributions, gender statistics, and population growth trends.',
            relevanceScore: 0.70,
            metadata: {
              conceptSchemeId: 'CS_DEMOGRAPHICS',
              dataflowIdentifier: 'POP_DEMO',
              tags: ['demographics', 'population', 'census']
            }
          }
        ];

        setSearchResults(mockResults);
        setLoading(false);
        return;
      }

      try {
        const results = await azureFoundryService.searchDatasets({
          query: content.trim(),
          maxResults: 5,
          threshold: 0.3
        });

        setSearchResults(results);

        const responseContent = results.length > 0
          ? `I found ${results.length} relevant datasets for your query. Here are the recommendations:\n\n${results.map(r => `• ${r.title}: ${r.description.substring(0, 100)}...`).join('\n')}\n\nPlease select a dataset to explore the data further.`
          : 'I couldn\'t find any datasets matching your query. Please try rephrasing your question or using different keywords.';

        updateMessage(assistantMessage.id, {
          content: responseContent,
          isLoading: false
        });

      } catch (searchError) {
        console.error('Search error:', searchError);
        
        const conversationHistory = [
          ...chatState.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: content.trim() }
        ];

        const fallbackResponse = await azureFoundryService.getChatResponse(conversationHistory);
        
        updateMessage(assistantMessage.id, {
          content: fallbackResponse,
          isLoading: false
        });
      }

    } catch (error) {
      console.error('Send message error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => !msg.isLoading)
      }));
    } finally {
      setLoading(false);
    }
  }, [chatState.isLoading, chatState.messages, addMessage, updateMessage, setLoading, setError]);

  const clearConversation = useCallback(() => {
    setChatState({
      messages: [],
      isLoading: false,
      error: null
    });
    setSearchResults([]);
  }, []);

  return {
    ...chatState,
    searchResults,
    sendMessage,
    clearError,
    clearConversation,
    setSearchResults
  };
};