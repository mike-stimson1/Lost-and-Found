# Australian Government Dataset Scanner

An AI-powered chat tool that helps users discover and explore relevant Australian government datasets through natural language queries. Built with React, TypeScript, Material-UI, and OpenAI Assistants API.

## Features

- **AI-Powered Search**: Natural language queries to find relevant datasets
- **Dataset Discovery**: Browse recommended datasets based on user intent
- **Data Visualization**: View actual dataset data through integrated Australian Government API calls
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Chat Interface**: Interactive conversation with AI assistant

## Prerequisites

1. **OpenAI Account**: You need access to OpenAI API
2. **Assistant Setup**: Create an OpenAI Assistant with the `selections.json` file uploaded as knowledge
3. **API Configuration**: Get your OpenAI API key and Assistant ID from the OpenAI platform

## Installation

1. Clone the repository and navigate to the app directory:

```bash
cd dataset-scanner-app
```

2. Install dependencies:

```bash
npm install
```

3. Install Vercel CLI globally (required for local development):

```bash
npm install -g vercel
```

4. Set up environment variables:

```bash
cp .env.example .env
```

5. Edit `.env` file with your OpenAI credentials:

```env
OPENAI_API_KEY=your-api-key-here
OPENAI_ASSISTANT_ID=your-assistant-id
```

## Local Development

This application uses Vercel serverless functions for secure API handling. To run locally:

1. Start the development server with Vercel CLI:

```bash
vercel dev
```

2. Open your browser and navigate to the URL shown (typically `http://localhost:3000`)

3. Start asking questions about Australian government datasets:
   - "Show me datasets about employment statistics"
   - "What data is available on housing prices?"
   - "Find datasets related to population demographics"

## How It Works

1. **User Query**: Type a natural language question about datasets
2. **AI Processing**: OpenAI Assistant analyzes your query against the knowledge base
3. **Dataset Recommendations**: AI returns relevant datasets with relevance scores
4. **Data Exploration**: Select datasets to view actual data from Australian Gov API
5. **Interactive Results**: Browse structured data with filtering and pagination

## API Integration

The app integrates with:

- **OpenAI Assistants API**: For natural language processing and dataset recommendations
- **Australian Bureau of Statistics API**: For fetching actual dataset data
  - Base URL: `https://data.api.abs.gov.au/rest/data/`
  - Supports various parameters: date ranges, detail levels, dimensions

## Project Structure

```
api/                    # Vercel serverless functions
├── chat.ts                    # OpenAI chat API endpoint
└── search.ts                  # Dataset search API endpoint
src/
├── components/          # React components
│   ├── ChatInterface.tsx       # Main chat UI
│   ├── DatasetCard.tsx        # Dataset display cards
│   ├── DatasetViewer.tsx      # Data table viewer
│   └── SearchResults.tsx      # Search results grid
├── services/           # API services
│   ├── openaiAssistant.ts     # Frontend API client (calls /api routes)
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

| Variable                | Description                      | Required            |
| ----------------------- | -------------------------------- | ------------------- |
| `OPENAI_API_KEY`        | Your OpenAI API key              | Yes                 |
| `OPENAI_ASSISTANT_ID`   | Your OpenAI Assistant ID         | Yes                 |
| `ABS_API_TIMEOUT`       | API timeout in milliseconds      | No (default: 30000) |
| `MAX_SEARCH_RESULTS`    | Maximum search results to return | No (default: 5)     |

**Security Note**: Environment variables are now processed server-side via Vercel serverless functions, keeping your API keys secure and never exposed to the browser.

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
   - `OPENAI_ASSISTANT_ID`

### Manual Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Troubleshooting

### OpenAI Issues

- Verify your API key is correct and has proper permissions
- Ensure your Assistant ID matches exactly
- Make sure your Assistant has the selections.json file uploaded as knowledge
- Verify the selections.json file contains dataset entries with 'id' and 'description' fields

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
