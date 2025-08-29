import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  LinearProgress
} from '@mui/material';
import {
  Visibility as ViewIcon,
  DataUsage as DataIcon
} from '@mui/icons-material';
import type { SearchResult } from '../types/chat';

interface DatasetCardProps {
  dataset: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onView?: () => void;
}

const DatasetCard: React.FC<DatasetCardProps> = ({
  dataset,
  isSelected,
  onSelect,
  onView
}) => {
  const relevancePercentage = Math.round(dataset.relevanceScore * 100);
  
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 4,
          borderColor: 'primary.light'
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
          <DataIcon color="primary" sx={{ mt: 0.5 }} />
          <Typography 
            variant="h6" 
            component="h3" 
            sx={{ 
              fontWeight: 600,
              lineHeight: 1.3
            }}
          >
            {dataset.title}
          </Typography>
        </Box>

        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {dataset.description}
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Relevance Score
            </Typography>
            <Typography variant="caption" fontWeight="medium">
              {relevancePercentage}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={relevancePercentage}
            color={getRelevanceColor(dataset.relevanceScore)}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {dataset.metadata.conceptSchemeId && (
            <Chip 
              label={dataset.metadata.conceptSchemeId} 
              size="small" 
              variant="outlined"
            />
          )}
          {dataset.metadata.tags?.map((tag, index) => (
            <Chip 
              key={index}
              label={tag} 
              size="small" 
              color="secondary"
              variant="outlined"
            />
          ))}
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Button 
          size="small" 
          onClick={onSelect}
          variant={isSelected ? "contained" : "outlined"}
          color="primary"
        >
          {isSelected ? 'Selected' : 'Select'}
        </Button>
        
        {dataset.metadata.dataflowIdentifier && (
          <Button
            size="small"
            startIcon={<ViewIcon />}
            onClick={onView}
            disabled={!dataset.metadata.dataflowIdentifier}
          >
            View Data
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default DatasetCard;