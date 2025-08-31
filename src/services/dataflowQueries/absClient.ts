import type { ABSQueryOptions, QueryDefinition } from "./dataflowParser";

const BASE_URL = '/api';

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

export async function queryABSData(queryDefinition: QueryDefinition, options: ABSQueryOptions = {}): Promise<any> {
  const mergedOptions = { ...queryDefinition.defaultOptions, ...options };
  const queryString = buildQueryString(mergedOptions);
  const url = `${BASE_URL}${queryDefinition.endpoint}${queryString ? '?' + queryString : ''}`;
  const format = mergedOptions.format || 'json';
  const isMetadata = queryDefinition.endpoint.startsWith('/dataflow') || queryDefinition.endpoint.startsWith('/datastructure') || queryDefinition.endpoint.startsWith('/codelist');

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': getAcceptHeader(format, isMetadata)
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (format === 'json') {
      try {
        return await response.json();
      } catch (jsonError) {
        console.warn(`JSON parsing failed, falling back to text: ${jsonError}`);
        const text = await response.text();
        return text;
      }
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error(`Error querying ${url}:`, error);
    throw error;
  }
}