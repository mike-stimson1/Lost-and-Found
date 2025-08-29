import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Fade
} from '@mui/material';
import DatasetCard from './DatasetCard';
import type { SearchResult } from '../types/chat';

interface SearchResultsProps {
  results: SearchResult[];
  onSelectDataset: (datasetId: string) => void;
  selectedDataset: string | null;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onSelectDataset,
  selectedDataset
}) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <Fade in={true}>
      <Box sx={{ mt: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="h2">
            Dataset Recommendations
          </Typography>
          <Chip 
            label={`${results.length} found`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
          {results.map((result) => (
            <DatasetCard
              key={result.datasetId}
              dataset={result}
              isSelected={selectedDataset === result.datasetId}
              onSelect={() => onSelectDataset(result.datasetId)}
            />
          ))}
        </Box>
      </Box>
    </Fade>
  );
};

export default SearchResults;