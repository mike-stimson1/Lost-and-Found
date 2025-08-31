import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

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

  if (!OPENAI_API_KEY || !ASSISTANT_ID) {
    console.error('Environment variables missing:', { 
      hasApiKey: !!OPENAI_API_KEY, 
      hasAssistantId: !!ASSISTANT_ID 
    });
    return res.status(500).json({ error: 'OpenAI configuration missing' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
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

    // Add user message to thread
    const userMessages = messages.filter((msg: any) => msg.role === "user");
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (lastUserMessage) {
      await axios.post(
        `${baseURL}/threads/${threadId}/messages`,
        {
          role: "user",
          content: lastUserMessage.content,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );
    }

    // Run the assistant
    const runResponse = await axios.post(
      `${baseURL}/threads/${threadId}/runs`,
      {
        assistant_id: ASSISTANT_ID,
        max_completion_tokens: 800,
        temperature: 0.7,
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

    // Poll for completion
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const runStatusResponse = await axios.get(
        `${baseURL}/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );

      const status = runStatusResponse.data.status;

      if (status === "completed") {
        // Get messages from thread
        const messagesResponse = await axios.get(
          `${baseURL}/threads/${threadId}/messages`,
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "OpenAI-Beta": "assistants=v2",
            },
          }
        );

        const messages = messagesResponse.data.data;
        const assistantMessage = messages.find(
          (msg: any) => msg.role === "assistant"
        );

        if (assistantMessage && assistantMessage.content[0]?.text?.value) {
          return res.status(200).json({ 
            response: assistantMessage.content[0].text.value 
          });
        }
        break;
      } else if (
        status === "failed" ||
        status === "cancelled" ||
        status === "expired"
      ) {
        throw new Error(`Run ${status}`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    return res.status(500).json({ error: 'Request timed out' });
  } catch (error) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ error: 'Failed to get response from AI assistant' });
  }
}