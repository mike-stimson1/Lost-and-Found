import type { ABSDataflowData, ABSDataflowsResponse } from "./dataflowParser";
import * as fs from 'fs';

export interface Selection{
  id: string;
  description: string;
}

export function toSelection(dataflow: ABSDataflowData): Selection {
  return {
    id: dataflow.id,
    description: dataflow.description
  };
}

export function getSelections(response: ABSDataflowsResponse): Selection[] {
  return response.data.dataflows.map(toSelection);
}

export function printSelectionsToCsv(selections: Selection[], filename: string): void {
  const csvHeader = 'id,description\n';
  const csvRows = selections.map(selection => 
    `${selection.id},"${(selection.description || '').replace(/"/g, '""')}"`
  ).join('\n');
  
  const csvContent = csvHeader + csvRows;
  fs.writeFileSync(filename, csvContent, 'utf8');
}

export function getDataFlowFromSelection(selection: Selection, allDataFlows: ABSDataflowData[]): ABSDataflowData | null {
  return allDataFlows.find(dataflow => dataflow.id === selection.id) || null;
}
