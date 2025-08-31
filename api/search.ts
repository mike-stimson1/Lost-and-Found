import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

interface SearchResult {
  datasetId: string;
  title: string;
  description: string;
  relevanceScore: number;
  metadata: {
    conceptSchemeId: string;
    dataflowIdentifier: string;
    lastUpdated: string;
    tags: string[];
    dataKey?: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Debug env vars:', { 
    hasApiKey: !!OPENAI_API_KEY, 
    hasAssistantId: !!ASSISTANT_ID,
    apiKeyLength: OPENAI_API_KEY?.length || 0,
    assistantIdLength: ASSISTANT_ID?.length || 0,
    allEnvKeys: Object.keys(process.env).sort()
  });

  if (!OPENAI_API_KEY || !ASSISTANT_ID) {
    console.error('Environment variables missing:', { 
      hasApiKey: !!OPENAI_API_KEY, 
      hasAssistantId: !!ASSISTANT_ID,
      envKeys: Object.keys(process.env).filter(k => k.includes('OPENAI'))
    });
    return res.status(500).json({ 
      error: 'OpenAI configuration missing',
      details: {
        hasApiKey: !!OPENAI_API_KEY,
        hasAssistantId: !!ASSISTANT_ID
      }
    });
  }

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const baseURL = "https://api.openai.com/v1";

    // Create a thread
    const threadResponse = await axios.post(
      `${baseURL}/threads`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );

    const threadId = threadResponse.data.id;

    // Build search prompt
    const searchPrompt = `
User query: "${query}"

Based on this query, search through the Australian government dataset information in selections.json and suggest the most relevant datasets by calling the suggest_datasets function. Consider:
1. The user's intent and what type of data they might need
2. Keywords and domain areas mentioned in the dataset descriptions
3. Potential use cases and applications
4. Match against dataset IDs and descriptions in the selections.json file

Respond with human-like conversation (1-2 sentences). The suggest_datasets function will display the relevant datasets and must be called

Call the suggest_datasets function with up to 5 most relevant datasets from selections.json, providing their exact IDs and descriptions as they appear in the file.
    `.trim();

    // Add message to thread
    await axios.post(
      `${baseURL}/threads/${threadId}/messages`,
      {
        role: "user",
        content: searchPrompt,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );

    // Run the assistant with required tool call
    const runResponse = await axios.post(
      `${baseURL}/threads/${threadId}/runs`,
      {
        assistant_id: ASSISTANT_ID,
        max_completion_tokens: 1000,
        temperature: 0.3,
        tool_choice: "required"
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );

    const runId = runResponse.data.id;

    // Poll for completion and handle function calls
    const functionCalls = await pollRunCompletionForFunctionCalls(threadId, runId, baseURL, OPENAI_API_KEY);

    if (!functionCalls || functionCalls.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const results = convertFunctionCallsToSearchResults(functionCalls);
    return res.status(200).json({ results });

  } catch (error) {
    console.error('Error in search API:', error);
    return res.status(500).json({ error: 'Failed to search datasets' });
  }
}

async function pollRunCompletionForFunctionCalls(
  threadId: string,
  runId: string,
  baseURL: string,
  apiKey: string
) {
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const runStatusResponse = await axios.get(
      `${baseURL}/threads/${threadId}/runs/${runId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );

    const status = runStatusResponse.data.status;
    const runData = runStatusResponse.data;

    if (status === "completed") {
      if (runData.required_action?.type === "submit_tool_outputs") {
        return runData.required_action.submit_tool_outputs.tool_calls || [];
      }
      return [];
    } else if (status === "requires_action") {
      if (runData.required_action?.type === "submit_tool_outputs") {
        return runData.required_action.submit_tool_outputs.tool_calls || [];
      }
    } else if (
      status === "failed" ||
      status === "cancelled" ||
      status === "expired"
    ) {
      throw new Error(`Run ${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error("Function call polling timed out");
}

function convertFunctionCallsToSearchResults(functionCalls: any[]): SearchResult[] {
  const results: SearchResult[] = [];

  functionCalls.forEach((call, index) => {
    if (call.function.name === "suggest_datasets") {
      let args: any;
      
      if (typeof call.function.arguments === 'string') {
        try {
          args = JSON.parse(call.function.arguments);
        } catch (e) {
          console.error("Failed to parse function arguments:", e);
          return;
        }
      } else {
        args = call.function.arguments;
      }
      
      if (!args || !args.datasets || !Array.isArray(args.datasets)) {
        return;
      }
      
      args.datasets.forEach((dataset: any) => {
        results.push({
          datasetId: dataset.id,
          title: getDatasetTitleFromId(dataset.id),
          description: dataset.description,
          relevanceScore: 0.9,
          metadata: {
            conceptSchemeId: dataset.id,
            dataflowIdentifier: dataset.id,
            lastUpdated: new Date().toISOString(),
            tags: ["ABS", "suggested"],
          },
        });
      });
    }
  });

  return results;
}

function getDatasetTitleFromId(datasetId: string): string {
  return (
    datasetId
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim() || "ABS Dataset"
  );
}