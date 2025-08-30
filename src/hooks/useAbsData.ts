import { useState, useCallback } from 'react';
import axios from 'axios';
import type { DatasetData } from '../types/dataset';

interface AbsDataState {
  data: DatasetData | null;
  isLoading: boolean;
  error: string | null;
}

interface AbsDataResponse {
  structure: {
    dimensions: {
      observation: Array<{
        id: string;
        name: string;
        values: Array<{
          id: string;
          name: string;
        }>;
      }>;
    };
  };
  dataSets: Array<{
    observations: Record<string, [number]>;
  }>;
}

export const useAbsData = () => {
  const [state, setState] = useState<AbsDataState>({
    data: null,
    isLoading: false,
    error: null
  });

  const fetchAbsData = useCallback(async (datasetId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await axios.get<AbsDataResponse>(
        `https://data.api.abs.gov.au/rest/data/${datasetId}`,
        {
          headers: {
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      // Transform ABS API response to match DatasetData interface
      const rawDimensions = response.data.structure?.dimensions?.observation || [];
      const processedData: DatasetData = {
        structure: {
          dimensions: rawDimensions.map((dim: { id?: string; name?: string }, index: number) => ({
            id: dim.id || `dimension_${index}`,
            name: dim.name || dim.id || `Dimension ${index}`,
            keyPosition: index,
            role: 'dimension'
          })),
          attributes: [],
          measures: []
        },
        observations: Object.entries(response.data.dataSets[0]?.observations || {}).map(([key, value]) => ({
          key: key.split(':'),
          value: Array.isArray(value) ? value[0] : value,
          attributes: {}
        }))
      };

      setState({
        data: processedData,
        isLoading: false,
        error: null
      });

      return processedData;
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) 
        ? `Failed to fetch data: ${error.response?.status} ${error.response?.statusText || error.message}`
        : 'Failed to fetch ABS data';

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
    fetchAbsData,
    clearData
  };
};