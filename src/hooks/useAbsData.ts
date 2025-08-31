import { useState, useCallback } from 'react';
import { queryABSData, type QueryDefinition } from '../services/dataflowQueries/absClient';
import { loadQuery } from '../services/dataflowQueries/dataflowParser';
import type { DatasetData } from '../types/dataset';

interface AbsDataState {
  data: DatasetData | null;
  isLoading: boolean;
  error: string | null;
  query: QueryDefinition | null;
}

export const useAbsData = () => {
  const [state, setState] = useState<AbsDataState>({
    data: null,
    isLoading: false,
    error: null,
    query: null
  });

  const fetchAbsData = useCallback(async (datasetId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Load the query definition for this dataset
      const queryDefinition = await loadQuery(datasetId);
      
      if (!queryDefinition) {
        throw new Error(`Dataset ${datasetId} not found in available dataflows`);
      }

      // Execute the ABS query
      const rawData = await queryABSData(queryDefinition);
      
      // Parse the response based on format
      const parsedData = parseAbsResponse(rawData, queryDefinition);

      setState({
        data: parsedData,
        isLoading: false,
        error: null,
        query: queryDefinition
      });

      return parsedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ABS data';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const clearData = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      query: null
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getAvailableDatasets = useCallback(async () => {
    try {
      const { loadAvailableQueries } = await import('../services/dataflowQueries/dataflowParser');
      return await loadAvailableQueries();
    } catch (error) {
      console.error('Failed to load available datasets:', error);
      return [];
    }
  }, []);

  return {
    ...state,
    fetchAbsData,
    clearData,
    clearError,
    getAvailableDatasets
  };
};

function parseAbsResponse(rawData: string, queryDefinition: QueryDefinition): DatasetData {
  const format = queryDefinition.defaultOptions?.format || 'json';
  
  try {
    if (format === 'json') {
      return parseJsonResponse(rawData);
    } else if (format.startsWith('csv')) {
      return parseCsvResponse(rawData);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    console.error('Failed to parse ABS response:', error);
    throw new Error('Failed to parse dataset response');
  }
}

function parseJsonResponse(rawData: string): DatasetData {
  const jsonData = JSON.parse(rawData);
  
  // Handle SDMX-JSON format
  if (jsonData.data && jsonData.data.structure) {
    const structure = jsonData.data.structure;
    const dataSets = jsonData.data.dataSets || [];
    
    const dimensions = (structure.dimensions?.observation || []).map((dim: any) => ({
      id: dim.id,
      name: dim.name || dim.id,
      keyPosition: dim.keyPosition || 0,
      role: dim.role || 'dimension'
    }));

    const attributes = (structure.attributes?.observation || []).map((attr: any) => ({
      id: attr.id,
      name: attr.name || attr.id,
      assignmentStatus: attr.assignmentStatus || 'conditional'
    }));

    const measures = (structure.dimensions?.series || []).map((measure: any) => ({
      id: measure.id,
      name: measure.name || measure.id
    }));

    const observations: any[] = [];
    
    if (dataSets.length > 0 && dataSets[0].observations) {
      const obs = dataSets[0].observations;
      Object.entries(obs).forEach(([key, value]: [string, any]) => {
        observations.push({
          key: key.split(':'),
          value: Array.isArray(value) ? value[0] : value,
          attributes: Array.isArray(value) && value[1] ? value[1] : {}
        });
      });
    }

    return {
      structure: { dimensions, attributes, measures },
      observations
    };
  }
  
  // Fallback for basic JSON format
  return {
    structure: {
      dimensions: [],
      attributes: [],
      measures: []
    },
    observations: []
  };
}

function parseCsvResponse(rawData: string): DatasetData {
  const lines = rawData.trim().split('\n');
  if (lines.length < 2) {
    return {
      structure: {
        dimensions: [],
        attributes: [],
        measures: []
      },
      observations: []
    };
  }

  // Parse CSV header to understand structure
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Infer dimensions, measures, and attributes from headers
  const dimensions = headers
    .filter(h => !['VALUE', 'OBS_VALUE', 'TIME_PERIOD'].includes(h.toUpperCase()))
    .map((header, index) => ({
      id: header,
      name: header,
      keyPosition: index,
      role: 'dimension'
    }));

  const measures = [{
    id: 'OBS_VALUE',
    name: 'Value'
  }];

  const attributes: any[] = [];

  const observations = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const keyValues = values.slice(0, -1); // All except last (value)
    const value = values[values.length - 1];
    
    return {
      key: keyValues,
      value: isNaN(Number(value)) ? value : Number(value),
      attributes: {}
    };
  });

  return {
    structure: { dimensions, attributes, measures },
    observations
  };
}