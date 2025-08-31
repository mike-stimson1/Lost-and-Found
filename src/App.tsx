import { useState } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Box,
  IconButton,
  Drawer
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  DataUsage as DataIcon
} from '@mui/icons-material';
import theme from './theme';
import ChatInterface from './components/ChatInterface';
import SearchResults from './components/SearchResults';
import DatasetViewer from './components/DatasetViewer';
import DatasetSidebar from './components/DatasetSidebar';
import { useChat } from './hooks/useChat';
import { useAbsData } from './hooks/useAbsData';

function App() {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const chat = useChat();
  const absData = useAbsData();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSelectDataset = (datasetId: string) => {
    setSelectedDataset(datasetId);
    absData.clearData();
    
    // Try to fetch data directly using the dataset ID
    absData.fetchAbsData(datasetId).catch(error => {
      console.error('Failed to fetch dataset:', error);
    });
  };

  const handleViewDataset = (datasetId: string) => {
    // Directly fetch ABS data for this dataset
    absData.fetchAbsData(datasetId).catch(error => {
      console.error('Failed to fetch ABS data:', error);
    });
    setSelectedDataset(datasetId);
  };

  const selectedDatasetInfo = chat.searchResults.find(r => r.datasetId === selectedDataset);

  const drawer = (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Dataset Scanner
      </Typography>
      <Typography variant="body2" color="text.secondary">
        AI-powered Australian Government dataset discovery tool
      </Typography>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <AppBar
          position="fixed"
          sx={{
            width: { sm: '100%' },
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <DataIcon sx={{ mr: 2 }} />
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Australian Government Dataset Scanner
            </Typography>
            <SearchIcon />
          </Toolbar>
        </AppBar>

        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>

        <Container
          component="main"
          maxWidth="xl"
          sx={{
            flexGrow: 1,
            pt: { xs: 8, sm: 10 },
            pb: 2,
            px: { xs: 2, sm: 3 }
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            height: 'calc(100vh - 120px)',
            flexDirection: { xs: 'column', md: 'row' }
          }}>
            {/* Chat Interface */}
            <Box sx={{ 
              flex: { xs: 1, md: 2 }, 
              minWidth: 0,
              height: { xs: '50%', md: '100%' }
            }}>
              <Paper 
                elevation={2}
                sx={{ 
                  height: '100%', 
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SearchIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Dataset Search
                  </Typography>
                </Box>
                
                <ChatInterface
                  messages={chat.messages}
                  isLoading={chat.isLoading}
                  error={chat.error}
                  onSendMessage={chat.sendMessage}
                  onClearError={chat.clearError}
                />
                
                {/* Keep original grid view for mobile/tablet */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  {chat.searchResults.length > 0 && (
                    <SearchResults
                      results={chat.searchResults}
                      onSelectDataset={handleSelectDataset}
                      onViewDataset={handleViewDataset}
                      selectedDataset={selectedDataset}
                    />
                  )}
                </Box>
              </Paper>
            </Box>

            {/* Dataset Suggestions Sidebar - Desktop only */}
            <Box sx={{ 
              flex: 1,
              minWidth: 280,
              maxWidth: 400,
              display: { xs: 'none', md: 'block' }
            }}>
              <DatasetSidebar
                results={chat.searchResults}
                onSelectDataset={handleSelectDataset}
                selectedDataset={selectedDataset}
              />
            </Box>

            {/* Dataset Viewer */}
            <Box sx={{ 
              flex: { xs: 1, md: 2 }, 
              minWidth: 0,
              height: { xs: '50%', md: '100%' }
            }}>
              <Paper 
                elevation={2}
                sx={{ 
                  height: '100%', 
                  p: 2,
                  overflow: 'auto'
                }}
              >
                {selectedDataset && selectedDatasetInfo ? (
                  <DatasetViewer
                    data={absData.data}
                    isLoading={absData.isLoading}
                    error={absData.error}
                    datasetTitle={selectedDatasetInfo.title}
                    datasetId={selectedDataset}
                  />
                ) : (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      height: '100%',
                      textAlign: 'center'
                    }}
                  >
                    <Box>
                      <DataIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Dataset Selected
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        Search for datasets and select one to view its data
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
