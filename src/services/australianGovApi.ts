import axios from 'axios';
import type { AustralianGovApiParams, DatasetData } from '../types/dataset';

const ABS_API_BASE = 'https://data.api.abs.gov.au/rest/data';

export class AustralianGovApiService {
  async fetchDatasetData(params: AustralianGovApiParams): Promise<DatasetData> {
    const { dataflowIdentifier, dataKey, startPeriod, endPeriod, detail, dimensionAtObservation } = params;

    const url = `${ABS_API_BASE}/${dataflowIdentifier}/${dataKey}`;
    
    const queryParams = new URLSearchParams();
    if (startPeriod) queryParams.append('startPeriod', startPeriod);
    if (endPeriod) queryParams.append('endPeriod', endPeriod);
    if (detail) queryParams.append('detail', detail);
    if (dimensionAtObservation) queryParams.append('dimensionAtObservation', dimensionAtObservation);

    const fullUrl = queryParams.toString() ? `${url}?${queryParams}` : url;

    try {
      const response = await axios.get(fullUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Dataset-Scanner-App/1.0'
        },
        timeout: 30000
      });

      return this.parseDatasetResponse(response.data);
    } catch (error) {
      console.error('Error fetching dataset:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Dataset not found. Please check the dataflow identifier and data key.');
        } else if (error.response?.status === 400) {
          throw new Error('Invalid request parameters. Please check your query parameters.');
        } else if (error.response?.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        }
      }
      
      throw new Error('Failed to fetch dataset data. Please try again.');
    }
  }

  async getDataStructure(dataflowIdentifier: string): Promise<any> {
    const url = `${ABS_API_BASE}/${dataflowIdentifier}?detail=dataonly`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Dataset-Scanner-App/1.0'
        },
        timeout: 15000
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching data structure:', error);
      throw new Error('Failed to fetch dataset structure');
    }
  }

  async validateDataflowIdentifier(dataflowIdentifier: string): Promise<boolean> {
    try {
      await this.getDataStructure(dataflowIdentifier);
      return true;
    } catch {
      return false;
    }
  }

  private parseDatasetResponse(data: any): DatasetData {
    const structure = data.structure || {};
    const observations = data.observations || data.dataSets?.[0]?.observations || {};

    return {
      structure: {
        dimensions: this.parseDimensions(structure.dimensions?.observation || []),
        attributes: this.parseAttributes(structure.attributes?.observation || []),
        measures: this.parseMeasures(structure.measures || [])
      },
      observations: this.parseObservations(observations)
    };
  }

  private parseDimensions(dimensions: any[]): any[] {
    return dimensions.map((dim, index) => ({
      id: dim.id || `dim_${index}`,
      name: dim.name || dim.id || `Dimension ${index + 1}`,
      keyPosition: dim.keyPosition ?? index,
      role: dim.role || 'dimension'
    }));
  }

  private parseAttributes(attributes: any[]): any[] {
    return attributes.map((attr, index) => ({
      id: attr.id || `attr_${index}`,
      name: attr.name || attr.id || `Attribute ${index + 1}`,
      assignmentStatus: attr.assignmentStatus || 'optional'
    }));
  }

  private parseMeasures(measures: any[]): any[] {
    return measures.map((measure, index) => ({
      id: measure.id || `measure_${index}`,
      name: measure.name || measure.id || `Measure ${index + 1}`
    }));
  }

  private parseObservations(observations: any): any[] {
    const obsArray = [];
    
    if (Array.isArray(observations)) {
      return observations.map((obs, index) => ({
        key: obs.key || [`obs_${index}`],
        value: obs.value ?? null,
        attributes: obs.attributes || {}
      }));
    } else if (typeof observations === 'object') {
      for (const [key, value] of Object.entries(observations)) {
        if (typeof value === 'object' && value !== null && 'value' in value) {
          obsArray.push({
            key: key.split(':'),
            value: (value as any).value,
            attributes: (value as any).attributes || {}
          });
        } else {
          obsArray.push({
            key: key.split(':'),
            value: value,
            attributes: {}
          });
        }
      }
    }

    return obsArray;
  }

  buildDataKey(dimensions: Record<string, string>): string {
    return Object.values(dimensions).join('.');
  }

  formatPeriod(date: Date | string): string {
    if (typeof date === 'string') {
      return date;
    }
    return date.toISOString().split('T')[0];
  }
}

export const australianGovApiService = new AustralianGovApiService();
export default australianGovApiService;