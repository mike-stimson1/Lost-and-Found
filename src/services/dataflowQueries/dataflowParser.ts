import type { QueryDefinition } from "./absClient";

// File format of the "all endpoints" query
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
//////

export interface ABSQueryOptions {
  startPeriod?: string;
  endPeriod?: string;
  detail?: 'full' | 'dataonly' | 'serieskeysonly' | 'nodata';
  format?: 'json' | 'csv' | 'csv-labels' | 'csv-file' | 'xml';
}

export async function loadQuery(queryId: string): Promise<QueryDefinition | null> {
  try {
    const queries = await loadAvailableQueries();
    console.log(`[DataflowParser] Looking for dataset: ${queryId}`);
    console.log(`[DataflowParser] Total available queries: ${queries.length}`);
    
    const found = queries.find(query => query.id === queryId);
    if (found) {
      console.log(`[DataflowParser] Found dataset: ${found.id} - ${found.name}`);
    } else {
      console.log(`[DataflowParser] Dataset ${queryId} not found. Available IDs:`, queries.slice(0, 10).map(q => q.id));
    }
    
    return found || null;
  } catch (error) {
    console.error(`Failed to load query ${queryId}:`, error);
    return null;
  }
}


export async function loadAvailableQueries(): Promise<QueryDefinition[]> {
  try {
    const dataflows = await loadDataflows();
    return parseDataflowsToQueries(dataflows);
  } catch (error) {
    console.error('Failed to load dataflows, falling back to hardcoded queries:', error);
    // Fallback to a few essential queries if loading fails
    return [];
  }
}


export async function loadDataflows(): Promise<ABSDataflowsResponse> {
  const response = await fetch('/abs-dataflows.json');
  if (!response.ok) {
    throw new Error(`Failed to load dataflows: ${response.statusText}`);
  }
  return await response.json();
}




function generateDefaultOptions(_dataflow: ABSDataflowData): ABSQueryOptions {
  const options: ABSQueryOptions = {
    detail: 'dataonly',
    format: 'csv-labels'
  };

  return options;
}

function createEndpoint(dataflow: ABSDataflowData): string {
  // Try the full SDMX dataflow identifier format
  return `/data/${dataflow.agencyID},${dataflow.id},${dataflow.version}/all`;
}

function shouldIncludeDataflow(dataflow: ABSDataflowData): boolean {
  // Filter out layout and annotation entries that aren't actual dataflows
  const isAnnotation = dataflow.id.startsWith('LAYOUT_') || !dataflow.name || !dataflow.description;
  
  // Debug specific dataset
  if (dataflow.id === 'ABS_C16_T28_LGA') {
    console.log(`[DataflowParser] Checking ABS_C16_T28_LGA:`, {
      id: dataflow.id,
      hasName: !!dataflow.name,
      hasDescription: !!dataflow.description,
      isAnnotation,
      willInclude: !isAnnotation
    });
  }

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
  console.log(`[DataflowParser] Filtered ${filtered.length} dataflows from ${dataflowsResponse.data.dataflows.length} total`);
  
  // Sort by relevance and include all datasets (remove the slice limit for now)
  const sorted = filtered
    .map(dataflow => ({
      dataflow,
      score: calculateRelevanceScore(dataflow)
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ dataflow, score }) => {
      // Debug specific dataset
      if (dataflow.id === 'ABS_C16_T28_LGA') {
        console.log(`[DataflowParser] ABS_C16_T28_LGA relevance score: ${score}`);
      }
      return toQueryDefinition(dataflow);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`[DataflowParser] Returning ${sorted.length} query definitions`);
  return sorted;
}

function calculateRelevanceScore(dataflow: ABSDataflowData): number {
  let score = 0;
  
  // High priority datasets
  const highPriorityKeywords = ['CPI', 'LABOUR', 'EMPLOYMENT', 'POPULATION', 'RETAIL', 'CENSUS'];
  const mediumPriorityKeywords = ['GDP', 'HOUSING', 'INCOME', 'BUSINESS'];
  
  // Check ID
  if (highPriorityKeywords.some(k => dataflow.id.includes(k))) score += 10;
  else if (mediumPriorityKeywords.some(k => dataflow.id.includes(k))) score += 5;
  
  // Check name
  if (highPriorityKeywords.some(k => dataflow.name.toUpperCase().includes(k))) score += 8;
  else if (mediumPriorityKeywords.some(k => dataflow.name.toUpperCase().includes(k))) score += 4;
  
  // Prefer recent data (check for recent years in description)
  if (dataflow.description.includes('2024') || dataflow.description.includes('2023')) score += 3;
  if (dataflow.description.includes('2022') || dataflow.description.includes('2021')) score += 2;
  
  // Give some points for older census data since it's still valuable
  if (dataflow.id.includes('CENSUS') && (dataflow.description.includes('2016') || dataflow.description.includes('2011'))) score += 1;
  
  // Prefer shorter names (likely more general/important)
  if (dataflow.name.length < 100) score += 1;
  
  return score;
}


