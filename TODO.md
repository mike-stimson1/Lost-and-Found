# AI Dataset Discovery Tool - Implementation Steps

## Overview
Build an AI-powered chat tool to help users discover relevant Australian government datasets through Azure Foundry vector store queries, with the ability to view actual dataset data via the Australian Gov API.

**Tech Stack:** Vite + React 18 + TypeScript + Material-UI + Azure Foundry

**API Endpoint:** `https://data.api.abs.gov.au/rest/data/{dataflowIdentifier}/{dataKey}?startPeriod={date}&endPeriod={date}&detail={value}&dimensionAtObservation={value}`

## Step-by-Step Implementation Process

### 1. Project Setup & Dependencies
- [ ] Initialize Vite project with React 18 + TypeScript template
- [ ] Install Material-UI (`@mui/material`, `@emotion/react`, `@emotion/styled`)
- [ ] Add Azure SDK for JavaScript (`@azure/openai` or relevant Azure Foundry SDK)
- [ ] Install additional utilities (`axios` for API calls, `date-fns` for date handling)

### 2. Project Structure
```
src/
├── components/
│   ├── ChatInterface.tsx       # Main chat component
│   ├── DatasetCard.tsx        # Dataset result display
│   ├── DatasetViewer.tsx      # Data visualization component
│   └── SearchResults.tsx      # Search results container
├── services/
│   ├── azureFoundry.ts        # Azure Foundry API integration
│   └── australianGovApi.ts    # Australian Gov API integration  
├── types/
│   ├── dataset.ts             # Dataset type definitions
│   └── chat.ts                # Chat interface types
├── hooks/
│   ├── useChat.ts             # Chat state management
│   └── useDatasetQuery.ts     # Dataset querying logic
└── utils/
    ├── apiHelpers.ts          # API utility functions
    └── dataFormatters.ts      # Data formatting utilities
```

### 3. Azure Foundry Integration
- [ ] Configure Azure Foundry client with endpoint and API key
- [ ] Implement vector store query function that searches the conceptscheme.json data
- [ ] Create prompt engineering for dataset recommendation queries
- [ ] Handle streaming responses and conversation history

### 4. Core Components Development
- [ ] **ChatInterface**: Message input, conversation history, typing indicators
- [ ] **DatasetCard**: Display dataset metadata, descriptions, and quick actions
- [ ] **DatasetViewer**: Table/chart view of actual dataset data from Australian Gov API
- [ ] **SearchResults**: Grid layout for recommended datasets with filtering

### 5. Australian Government API Integration
- [ ] Implement API client for `https://data.api.abs.gov.au/rest/data/` endpoints
- [ ] Create functions to fetch actual dataset data using dataflow identifiers
- [ ] Add parameter handling for date ranges, detail levels, and dimensions
- [ ] Implement data parsing and formatting for display

### 6. State Management & User Flow
- [ ] Chat state: messages, loading, error handling
- [ ] Dataset state: search results, selected datasets, cached data
- [ ] User flow: Query → AI recommendations → Dataset selection → Data viewing

### 7. UI/UX Implementation
- [ ] Material-UI theme configuration with Australian government design guidelines
- [ ] Responsive layout for desktop and mobile
- [ ] Loading states, error boundaries, and user feedback
- [ ] Search filters and sorting options

### 8. Testing & Error Handling
- [ ] API error handling for both Azure Foundry and Australian Gov APIs
- [ ] Rate limiting and retry logic
- [ ] Input validation and sanitization
- [ ] Unit tests for core functions

## Prerequisites
- Azure Foundry setup with conceptscheme.json uploaded as vector store document
- Azure Foundry API credentials and endpoint
- Understanding of Australian Gov API structure and available datasets

## Key Features
1. **AI-Powered Search**: Natural language queries to find relevant datasets
2. **Dataset Discovery**: Browse recommended datasets based on user intent
3. **Data Visualization**: View actual dataset data through integrated API calls
4. **Responsive Design**: Works on desktop and mobile devices
5. **Error Handling**: Robust error handling for API failures and edge cases