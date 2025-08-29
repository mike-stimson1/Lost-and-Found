import { useState, useCallback } from 'react';
import australianGovApiService from '../services/australianGovApi';
import type { DatasetData, AustralianGovApiParams } from '../types/dataset';

interface DatasetQueryState {
  data: DatasetData | null;
  isLoading: boolean;
  error: string | null;
}

export const useDatasetQuery = () => {
  const [queryState, setQueryState] = useState<DatasetQueryState>({
    data: null,
    isLoading: false,
    error: null
  });

  const fetchDataset = useCallback(async (params: AustralianGovApiParams) => {
    setQueryState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await australianGovApiService.fetchDatasetData(params);
      setQueryState({
        data,
        isLoading: false,
        error: null
      });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dataset';
      setQueryState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const validateDataflow = useCallback(async (dataflowIdentifier: string): Promise<boolean> => {
    try {
      return await australianGovApiService.validateDataflowIdentifier(dataflowIdentifier);
    } catch (error) {
      console.error('Error validating dataflow:', error);
      return false;
    }
  }, []);

  const getDataStructure = useCallback(async (dataflowIdentifier: string) => {
    try {
      return await australianGovApiService.getDataStructure(dataflowIdentifier);
    } catch (error) {
      console.error('Error getting data structure:', error);
      throw error;
    }
  }, []);

  const clearData = useCallback(() => {
    setQueryState({
      data: null,
      isLoading: false,
      error: null
    });
  }, []);

  const clearError = useCallback(() => {
    setQueryState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...queryState,
    fetchDataset,
    validateDataflow,
    getDataStructure,
    clearData,
    clearError
  };
};