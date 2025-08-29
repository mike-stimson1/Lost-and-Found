export interface ConceptScheme {
  id: string;
  version: string;
  agencyID: string;
  isFinal: boolean;
  name: string;
  names: {
    en: string;
  };
  isPartial: boolean;
  concepts: Concept[];
}

export interface Concept {
  id: string;
  name: string;
  names: {
    en: string;
  };
  description?: string;
  descriptions?: {
    en: string;
  };
  annotations?: Annotation[];
}

export interface Annotation {
  type: string;
  text: string;
  texts: {
    en: string;
  };
}

export interface DatasetRecommendation {
  id: string;
  name: string;
  description: string;
  relevanceScore: number;
  dataflowIdentifier: string;
  conceptSchemeId: string;
}

export interface AustralianGovApiParams {
  dataflowIdentifier: string;
  dataKey: string;
  startPeriod?: string;
  endPeriod?: string;
  detail?: string;
  dimensionAtObservation?: string;
}

export interface DatasetData {
  structure: {
    dimensions: DataDimension[];
    attributes: DataAttribute[];
    measures: DataMeasure[];
  };
  observations: DataObservation[];
}

export interface DataDimension {
  id: string;
  name: string;
  keyPosition: number;
  role: string;
}

export interface DataAttribute {
  id: string;
  name: string;
  assignmentStatus: string;
}

export interface DataMeasure {
  id: string;
  name: string;
}

export interface DataObservation {
  key: string[];
  value: number | string;
  attributes: Record<string, string>;
}