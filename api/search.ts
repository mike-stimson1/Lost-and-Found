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

interface ChatResponse {
  message: string;
  suggestions: SearchResult[];
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
    const { query, conversationHistory = [] } = req.body;

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

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n' + 
        conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n');
    }

    // Build librarian prompt
    const librarianPrompt = `
You are a helpful librarian assistant specializing in Australian government datasets. Your role is to:

1. Have natural, human-like conversations with users
2. Ask clarifying questions to understand their data needs
3. Provide brief, friendly responses (1-2 sentences max)
4. Call suggest_datasets function to continuously live update the dataset suggestions

Guidelines for your responses:
- Be conversational and friendly, like a real librarian
- Ask follow-up questions to narrow down their needs
- Keep responses short and engaging
- Don't immediately jump to suggesting datasets unless the user's need is very clear
- Help users think through what type of data would be most useful for their purpose

User's current message: "${query}"${conversationContext}

Respond naturally as a librarian would. If you can identify specific relevant datasets based on the conversation, also call the suggest_datasets function with up to 3-5 datasets from selections.json.
    `.trim();

    // Add message to thread
    await axios.post(
      `${baseURL}/threads/${threadId}/messages`,
      {
        role: "user",
        content: librarianPrompt,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );

    // Run the assistant with optional tool calls
    const runResponse = await axios.post(
      `${baseURL}/threads/${threadId}/runs`,
      {
        assistant_id: ASSISTANT_ID,
        max_completion_tokens: 1000,
        temperature: 0.7,
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

    // Poll for completion and get both message and function calls
    const { message, functionCalls } = await pollRunCompletionForBoth(threadId, runId, baseURL, OPENAI_API_KEY);

    const suggestions = functionCalls && functionCalls.length > 0 
      ? convertFunctionCallsToSearchResults(functionCalls) 
      : [];

    const response: ChatResponse = {
      message: message || "I'm here to help you find the data you need. What are you looking for?",
      suggestions
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in search API:', error);
    return res.status(500).json({ error: 'Failed to search datasets' });
  }
}

async function pollRunCompletionForBoth(
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
      // Get the assistant's message from the thread
      const messagesResponse = await axios.get(
        `${baseURL}/threads/${threadId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );

      const messages = messagesResponse.data.data;
      const lastAssistantMessage = messages.find((msg: any) => msg.role === 'assistant');
      const messageContent = lastAssistantMessage?.content?.[0]?.text?.value || '';

      return {
        message: messageContent,
        functionCalls: []
      };
    } else if (status === "requires_action") {
      if (runData.required_action?.type === "submit_tool_outputs") {
        const toolCalls = runData.required_action.submit_tool_outputs.tool_calls;
        
        // Submit dummy outputs to complete the run and get the message
        const toolOutputs = toolCalls.map((call: any) => ({
          tool_call_id: call.id,
          output: "Dataset suggestions processed"
        }));

        await axios.post(
          `${baseURL}/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
          {
            tool_outputs: toolOutputs
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "OpenAI-Beta": "assistants=v2",
            },
          }
        );

        // Wait for completion and then get the message
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        // Get final run status
        const finalRunResponse = await axios.get(
          `${baseURL}/threads/${threadId}/runs/${runId}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "OpenAI-Beta": "assistants=v2",
            },
          }
        );

        if (finalRunResponse.data.status === "completed") {
          // Get the assistant's message
          const messagesResponse = await axios.get(
            `${baseURL}/threads/${threadId}/messages`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "OpenAI-Beta": "assistants=v2",
              },
            }
          );

          const messages = messagesResponse.data.data;
          const lastAssistantMessage = messages.find((msg: any) => msg.role === 'assistant');
          const messageContent = lastAssistantMessage?.content?.[0]?.text?.value || '';

          return {
            message: messageContent,
            functionCalls: toolCalls
          };
        }
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

  throw new Error("Polling timed out");
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