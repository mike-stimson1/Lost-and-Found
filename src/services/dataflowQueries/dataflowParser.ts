export interface ABSDataflowAnnotation {
  id?: string;
  title?: string;
  type: string;
  text?: string;
  texts?: {
    en?: string;
  };
}

export interface ABSDataflowData {
  id: string;
  version: string;
  agencyID: string;
  isFinal: boolean;
  name: string;
  names: {
    en: string;
  };
  description: string;
  descriptions: {
    en: string;
  };
  annotations: ABSDataflowAnnotation[];
  structure: string;
}

export interface ABSDataflowsResponse {
  data: {
    dataflows: ABSDataflowData[];
  };
}

export interface ABSQueryOptions {
  startPeriod?: string;
  endPeriod?: string;
  detail?: 'full' | 'dataonly' | 'serieskeysonly' | 'nodata';
  format?: 'json' | 'csv' | 'csv-labels' | 'csv-file' | 'xml';
}

export interface QueryDefinition {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  defaultOptions?: ABSQueryOptions;
}


export async function loadDataflows(): Promise<ABSDataflowsResponse> {
  const response = await fetch('/abs-dataflows.json');
  if (!response.ok) {
    throw new Error(`Failed to load dataflows: ${response.statusText}`);
  }
  return await response.json();
}


function generateDefaultOptions(dataflow: ABSDataflowData): ABSQueryOptions {
  const options: ABSQueryOptions = {
    detail: 'dataonly',
    format: 'csv-labels'
  };

  return options;
}

function createEndpoint(dataflow: ABSDataflowData): string {
  return `/data/ABS,${dataflow.id},${dataflow.version}/all`;
}

function shouldIncludeDataflow(dataflow: ABSDataflowData): boolean {
  // Filter out layout and annotation entries that aren't actual dataflows
  const isAnnotation = dataflow.id.startsWith('LAYOUT_') || !dataflow.name || !dataflow.description;

  return !isAnnotation;
}

function toQueryDefinition(dataflow: ABSDataflowData): QueryDefinition {
  return {
    id: dataflow.id,
    name: dataflow.name,
    description: dataflow.description,
    endpoint: createEndpoint(dataflow),
    defaultOptions: generateDefaultOptions(dataflow)
  };
}

export function parseDataflowsToQueries(dataflowsResponse: ABSDataflowsResponse): QueryDefinition[] {
  const filtered = dataflowsResponse.data.dataflows.filter(shouldIncludeDataflow);
  
  // Sort by relevance and take top 100
  const sorted = filtered
    .map(dataflow => ({
      dataflow,
      score: calculateRelevanceScore(dataflow)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)
    .map(({ dataflow }) => toQueryDefinition(dataflow))
    .sort((a, b) => a.name.localeCompare(b.name));

  return sorted;
}

function calculateRelevanceScore(dataflow: ABSDataflowData): number {
  let score = 0;
  
  // High priority datasets
  const highPriorityKeywords = ['CPI', 'LABOUR', 'EMPLOYMENT', 'POPULATION', 'RETAIL'];
  const mediumPriorityKeywords = ['GDP', 'CENSUS', 'HOUSING', 'INCOME', 'BUSINESS'];
  
  // Check ID
  if (highPriorityKeywords.some(k => dataflow.id.includes(k))) score += 10;
  else if (mediumPriorityKeywords.some(k => dataflow.id.includes(k))) score += 5;
  
  // Check name
  if (highPriorityKeywords.some(k => dataflow.name.toUpperCase().includes(k))) score += 8;
  else if (mediumPriorityKeywords.some(k => dataflow.name.toUpperCase().includes(k))) score += 4;
  
  // Prefer recent data (check for recent years in description)
  if (dataflow.description.includes('2024') || dataflow.description.includes('2023')) score += 3;
  if (dataflow.description.includes('2022') || dataflow.description.includes('2021')) score += 2;
  
  // Prefer shorter names (likely more general/important)
  if (dataflow.name.length < 100) score += 1;
  
  return score;
}

export async function loadAvailableQueries(): Promise<QueryDefinition[]> {
  try {
    const dataflows = await loadDataflows();
    return parseDataflowsToQueries(dataflows);
  } catch (error) {
    console.error('Failed to load dataflows, falling back to hardcoded queries:', error);
    // Fallback to a few essential queries if loading fails
    return [
      {
        id: 'cpi',
        name: 'Consumer Price Index (CPI)',
        description: 'Latest CPI data for Australia',
        endpoint: '/data/ABS,CPI,1.0.0/1.50.10001.10.Q',
        defaultOptions: {
          endPeriod: '2024-Q4',
          detail: 'dataonly',
          format: 'json'
        }
      },
      {
        id: 'dataflows',
        name: 'Available Dataflows',
        description: 'List all available ABS dataflows',
        endpoint: '/dataflow/ABS',
        defaultOptions: {
          format: 'json'
        }
      }
    ];
  }
}