import { useState, useCallback } from 'react';
import { queryABSData } from '../services/dataflowQueries/absClient';
import type { QueryDefinition, ABSQueryOptions } from '../services/dataflowQueries/dataflowParser';

interface AbsDataState {
  data: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useAbsData = () => {
  const [state, setState] = useState<AbsDataState>({
    data: null,
    isLoading: false,
    error: null
  });

  const fetchData = useCallback(async (queryDefinition: QueryDefinition, options?: ABSQueryOptions) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const data = await queryABSData(queryDefinition, options);
      setState({
        data,
        isLoading: false,
        error: null
      });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ABS data';
      setState({
        data: null,
        isLoading: false,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  }, []);

  const clearData = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    fetchData,
    clearData
  };
};