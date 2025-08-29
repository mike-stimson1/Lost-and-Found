# Australian Government Dataset Scanner

An AI-powered chat tool that helps users discover and explore relevant Australian government datasets through natural language queries. Built with React, TypeScript, Material-UI, and Azure OpenAI.

## Features

- **AI-Powered Search**: Natural language queries to find relevant datasets
- **Dataset Discovery**: Browse recommended datasets based on user intent
- **Data Visualization**: View actual dataset data through integrated Australian Government API calls
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Chat Interface**: Interactive conversation with AI assistant

## Prerequisites

1. **Azure OpenAI Account**: You need access to Azure OpenAI service
2. **Vector Store Setup**: Upload the `conceptscheme.json` to Azure Foundry as a vector store document
3. **API Configuration**: Get your Azure OpenAI endpoint, API key, and deployment name

## Installation

1. Clone the repository and navigate to the app directory:
```bash
cd dataset-scanner-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` file with your Azure OpenAI credentials:
```env
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
VITE_AZURE_OPENAI_API_KEY=your-api-key-here
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
```

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:5173`

3. Start asking questions about Australian government datasets:
   - "Show me datasets about employment statistics"
   - "What data is available on housing prices?"
   - "Find datasets related to population demographics"

## How It Works

1. **User Query**: Type a natural language question about datasets
2. **AI Processing**: Azure OpenAI analyzes your query against the vector store
3. **Dataset Recommendations**: AI returns relevant datasets with relevance scores
4. **Data Exploration**: Select datasets to view actual data from Australian Gov API
5. **Interactive Results**: Browse structured data with filtering and pagination

## API Integration

The app integrates with:
- **Azure OpenAI**: For natural language processing and dataset recommendations
- **Australian Bureau of Statistics API**: For fetching actual dataset data
  - Base URL: `https://data.api.abs.gov.au/rest/data/`
  - Supports various parameters: date ranges, detail levels, dimensions

## Project Structure

```
src/
├── components/          # React components
│   ├── ChatInterface.tsx       # Main chat UI
│   ├── DatasetCard.tsx        # Dataset display cards
│   ├── DatasetViewer.tsx      # Data table viewer
│   └── SearchResults.tsx      # Search results grid
├── services/           # API services
│   ├── azureFoundry.ts        # Azure OpenAI integration
│   └── australianGovApi.ts    # Australian Gov API client
├── types/              # TypeScript definitions
│   ├── dataset.ts             # Dataset type definitions
│   └── chat.ts                # Chat interface types
├── hooks/              # React hooks
│   ├── useChat.ts             # Chat state management
│   └── useDatasetQuery.ts     # Dataset querying
├── utils/              # Utility functions
└── theme.ts            # Material-UI theme
```

## Development

- **Framework**: Vite + React 18 + TypeScript
- **UI Library**: Material-UI v5
- **State Management**: React hooks + local state
- **HTTP Client**: Axios
- **Icons**: Material-UI Icons

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI endpoint URL | Yes |
| `VITE_AZURE_OPENAI_API_KEY` | Your Azure OpenAI API key | Yes |
| `VITE_AZURE_OPENAI_DEPLOYMENT_NAME` | Your model deployment name | Yes |
| `VITE_ABS_API_TIMEOUT` | API timeout in milliseconds | No (default: 30000) |
| `VITE_MAX_SEARCH_RESULTS` | Maximum search results to return | No (default: 5) |

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

### Azure OpenAI Issues
- Verify your endpoint URL includes the full path
- Check that your API key is correct and has proper permissions
- Ensure your deployment name matches exactly

### Dataset API Issues
- Some datasets may not be available or have restricted access
- Check the Australian Bureau of Statistics API documentation for valid parameters
- Network timeouts may occur with large datasets

### Development Issues
- Clear browser cache if you encounter stale data
- Check browser console for detailed error messages
- Ensure all environment variables are properly set

## License

This project is built for the Australian Government GovHack initiative.
