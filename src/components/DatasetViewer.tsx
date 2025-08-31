import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import type { DatasetData } from '../types/dataset';

interface DatasetViewerProps {
  data: DatasetData | null;
  isLoading: boolean;
  error: string | null;
  datasetTitle?: string;
  datasetId?: string;
}

const DatasetViewer: React.FC<DatasetViewerProps> = ({
  data,
  isLoading,
  error,
  datasetTitle = 'Dataset',
  datasetId
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const downloadCSV = () => {
    if (!data) return;

    const headers = [
      ...data.structure.dimensions.map(dim => dim.name),
      'Value',
      ...(data.structure.attributes.length > 0 ? data.structure.attributes.map(attr => attr.name) : [])
    ];

    const csvContent = [
      headers.join(','),
      ...data.observations.map(obs => {
        const dimensionValues = Array.isArray(obs.key) ? obs.key : [obs.key];
        const value = obs.value !== null && obs.value !== undefined ? obs.value.toString() : '';
        const attributeValues = data.structure.attributes.map(attr => 
          obs.attributes && obs.attributes[attr.id] ? obs.attributes[attr.id] : ''
        );
        
        return [...dimensionValues, value, ...attributeValues]
          .map(cell => {
            const cellStr = cell?.toString() || '';
            return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') 
              ? `"${cellStr.replace(/"/g, '""')}"` 
              : cellStr;
          })
          .join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${datasetTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return null;
  }

  const paginatedObservations = data.observations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          {datasetTitle} - Data View
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadCSV}
          disabled={!data || data.observations.length === 0}
        >
          Download CSV
        </Button>
      </Box>
      
      {datasetId && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Dataset ID: {datasetId} • {data?.observations.length || 0} observations
        </Typography>
      )}

      {/* Dataset Structure Information */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <InfoIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Dataset Structure</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Dimensions ({data.structure.dimensions.length})
              </Typography>
              {data.structure.dimensions.map((dim) => (
                <Chip 
                  key={dim.id}
                  label={`${dim.name} (${dim.id})`}
                  size="small"
                  sx={{ mb: 0.5, mr: 0.5 }}
                />
              ))}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Measures ({data.structure.measures.length})
              </Typography>
              {data.structure.measures.map((measure) => (
                <Chip 
                  key={measure.id}
                  label={`${measure.name} (${measure.id})`}
                  size="small"
                  color="primary"
                  sx={{ mb: 0.5, mr: 0.5 }}
                />
              ))}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Attributes ({data.structure.attributes.length})
              </Typography>
              {data.structure.attributes.map((attr) => (
                <Chip 
                  key={attr.id}
                  label={`${attr.name} (${attr.id})`}
                  size="small"
                  color="secondary"
                  sx={{ mb: 0.5, mr: 0.5 }}
                />
              ))}
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Data Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {data.structure.dimensions.map((dim) => (
                  <TableCell key={dim.id}>{dim.name}</TableCell>
                ))}
                <TableCell align="right">Value</TableCell>
                {data.structure.attributes.length > 0 && (
                  <TableCell>Attributes</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedObservations.map((obs, index) => (
                <TableRow 
                  key={index}
                  hover
                  sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}
                >
                  {Array.isArray(obs.key) ? obs.key.map((keyValue, keyIndex) => (
                    <TableCell key={keyIndex} component={keyIndex === 0 ? "th" : undefined} scope={keyIndex === 0 ? "row" : undefined}>
                      {keyValue || '-'}
                    </TableCell>
                  )) : (
                    <TableCell component="th" scope="row">
                      {obs.key || '-'}
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      fontFamily="monospace"
                      fontWeight={typeof obs.value === 'number' ? 'medium' : 'normal'}
                    >
                      {obs.value !== null && obs.value !== undefined 
                        ? (typeof obs.value === 'number' ? obs.value.toLocaleString() : obs.value.toString())
                        : '-'
                      }
                    </Typography>
                  </TableCell>
                  {data.structure.attributes.length > 0 && (
                    <TableCell>
                      {obs.attributes && Object.keys(obs.attributes).length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {Object.entries(obs.attributes).map(([key, value]) => (
                            <Chip
                              key={key}
                              label={`${key}: ${value}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={data.observations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {data.observations.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No observations found in this dataset.
        </Alert>
      )}
    </Box>
  );
};

export default DatasetViewer;