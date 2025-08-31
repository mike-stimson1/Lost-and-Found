import { useMemo } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

interface DatasetViewerProps {
  data: string | null;
  isLoading: boolean;
  error: string | null;
  datasetTitle?: string;
}

function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map(cell => cell.replace(/^"|"$/g, ''));
  });
}

export default function DatasetViewer({ data, isLoading, error, datasetTitle }: DatasetViewerProps) {
  const parsedData = useMemo(() => {
    if (!data) return null;
    try {
      return parseCSV(data);
    } catch (err) {
      console.error('Failed to parse CSV:', err);
      return null;
    }
  }, [data]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!data) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No data available
      </Typography>
    );
  }

  if (!parsedData || parsedData.length === 0) {
    return (
      <Alert severity="warning">Failed to parse CSV data</Alert>
    );
  }

  const headers = parsedData[0];
  const rows = parsedData.slice(1);

  return (
    <Box>
      {datasetTitle && (
        <Typography variant="h6" gutterBottom>
          {datasetTitle}
        </Typography>
      )}
      
      <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {headers.map((header, index) => (
                <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(0, 100).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {rows.length > 100 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Showing first 100 rows of {rows.length} total rows
        </Typography>
      )}
    </Box>
  );
}