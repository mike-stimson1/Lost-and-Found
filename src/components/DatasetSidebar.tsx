import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Chip,
  Paper,
  Fade,
  Divider
} from '@mui/material';
import {
  Dataset as DatasetIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import type { SearchResult } from '../types/chat';

interface DatasetSidebarProps {
  results: SearchResult[];
  onSelectDataset: (datasetId: string) => void;
  selectedDataset: string | null;
}

const DatasetSidebar: React.FC<DatasetSidebarProps> = ({
  results,
  onSelectDataset,
  selectedDataset
}) => {
  if (results.length === 0) {
    return (
      <Paper 
        elevation={2}
        sx={{ 
          height: '100%', 
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}
      >
        <DatasetIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Suggestions
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Search for datasets to see recommendations here
        </Typography>
      </Paper>
    );
  }

  return (
    <Fade in={true}>
      <Paper 
        elevation={2}
        sx={{ 
          height: '100%', 
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TrendingIcon color="primary" />
            <Typography variant="h6">
              Suggestions
            </Typography>
          </Box>
          <Chip 
            label={`${results.length} datasets`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
        
        <Divider />
        
        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {results.map((result) => (
            <ListItem key={result.datasetId} disablePadding>
              <ListItemButton
                selected={selectedDataset === result.datasetId}
                onClick={() => onSelectDataset(result.datasetId)}
                sx={{
                  py: 2,
                  px: 2,
                  borderLeft: selectedDataset === result.datasetId ? 3 : 0,
                  borderColor: 'primary.main',
                  '&.Mui-selected': {
                    backgroundColor: 'primary.50',
                    '&:hover': {
                      backgroundColor: 'primary.100',
                    },
                  },
                }}
              >
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: selectedDataset === result.datasetId ? 600 : 400,
                      mb: 0.5,
                      lineHeight: 1.3
                    }}
                  >
                    {result.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 1,
                      lineHeight: 1.3
                    }}
                  >
                    {result.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={`${Math.round(result.relevanceScore * 100)}% match`}
                      size="small"
                      color={result.relevanceScore > 0.8 ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                    <Typography 
                      variant="caption" 
                      color="text.disabled"
                      sx={{ fontSize: '0.7rem' }}
                    >
                      {result.datasetId}
                    </Typography>
                  </Box>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Fade>
  );
};

export default DatasetSidebar;