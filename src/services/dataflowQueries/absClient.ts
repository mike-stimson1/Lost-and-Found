import type { ABSQueryOptions } from "./dataflowParser";

// endpoint query
export interface QueryDefinition {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  defaultOptions?: ABSQueryOptions;
}

const BASE_URL = '/api/abs-data';

function getAcceptHeader(format: string, isMetadata: boolean = false): string {
  if (isMetadata) {
    switch (format) {
      case 'json':
        return 'application/vnd.sdmx.structure+json';
      default:
        return 'application/xml';
    }
  } else {
    switch (format) {
      case 'json':
        return 'application/vnd.sdmx.data+json';
      case 'csv':
        return 'text/csv';
      case 'csv-labels':
        return 'application/vnd.sdmx.data+csv;labels=both';
      case 'csv-file':
        return 'application/vnd.sdmx.data+csv;file=true;labels=both';
      default:
        return 'application/xml';
    }
  }
}

function buildQueryString(options: ABSQueryOptions): string {
  const params = new URLSearchParams();
  if (options.startPeriod) params.append('startPeriod', options.startPeriod);
  if (options.endPeriod) params.append('endPeriod', options.endPeriod);
  if (options.detail) params.append('detail', options.detail);
  return params.toString();
}

export async function queryABSData(queryDefinition: QueryDefinition, options: ABSQueryOptions = {}): Promise<string> {
  const mergedOptions = { ...queryDefinition.defaultOptions, ...options };
  const format = mergedOptions.format || 'json';
  const isMetadata = queryDefinition.endpoint.startsWith('/dataflow') || queryDefinition.endpoint.startsWith('/datastructure') || queryDefinition.endpoint.startsWith('/codelist');
  
  // Build URL with path parameter for the proxy
  const params = new URLSearchParams();
  params.append('path', queryDefinition.endpoint.substring(1)); // Remove leading slash
  
  // Add other query parameters
  if (mergedOptions.startPeriod) params.append('startPeriod', mergedOptions.startPeriod);
  if (mergedOptions.endPeriod) params.append('endPeriod', mergedOptions.endPeriod);
  if (mergedOptions.detail) params.append('detail', mergedOptions.detail);
  
  const url = `${BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': getAcceptHeader(format, isMetadata)
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error querying ${url}:`, error);
    throw error;
  }
}