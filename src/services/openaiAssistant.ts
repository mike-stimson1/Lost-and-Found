import axios from "axios";
import type {
  DatasetSearchQuery,
  SearchResult,
  FunctionCall,
  SuggestDatasetsArguments,
  QueryAbsDataArguments,
} from "../types/chat";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const ASSISTANT_ID = import.meta.env.VITE_OPENAI_ASSISTANT_ID;

if (!OPENAI_API_KEY || !ASSISTANT_ID) {
  console.warn(
    "OpenAI configuration missing. Please set environment variables."
  );
}

class OpenAIAssistantService {
  private isConfiguredValue: boolean;
  private baseURL = "https://api.openai.com/v1";

  constructor() {
    this.isConfiguredValue = !!(OPENAI_API_KEY && ASSISTANT_ID);
  }

  async searchDatasets(query: DatasetSearchQuery): Promise<SearchResult[]> {
    if (!this.isConfiguredValue) {
      throw new Error(
        "OpenAI client not configured. Please check environment variables."
      );
    }

    try {
      console.log("Starting dataset search for query:", query.query);

      // Create a thread
      const threadResponse = await axios.post(
        `${this.baseURL}/threads`,
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
      console.log("Created thread:", threadId);

      // Add message to thread
      const searchPrompt = this.buildSearchPrompt(query.query);
      console.log("Search prompt:", searchPrompt);

      await axios.post(
        `${this.baseURL}/threads/${threadId}/messages`,
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
        `${this.baseURL}/threads/${threadId}/runs`,
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
      console.log("Started run:", runId);
      console.log("Run response:", JSON.stringify(runResponse.data, null, 2));

      // Poll for completion and handle function calls
      const functionCalls = await this.pollRunCompletionForFunctionCalls(
        threadId,
        runId
      );

      if (!functionCalls || functionCalls.length === 0) {
        console.warn(
          "No function calls received from OpenAI Assistant for search"
        );
        // Return empty results instead of throwing error
        return [];
      }

      console.log(
        "Processing",
        functionCalls.length,
        "function calls for search"
      );
      return this.convertFunctionCallsToSearchResults(functionCalls);
    } catch (error) {
      console.error("Error searching datasets:", error);
      
      // Log detailed error information
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error("API Response Status:", axiosError.response?.status);
        console.error("API Response Data:", JSON.stringify(axiosError.response?.data, null, 2));
        console.error("API Response Headers:", JSON.stringify(axiosError.response?.headers, null, 2));
      }

      if (error instanceof Error) {
        // Check for specific OpenAI Assistant errors
        if (
          error.message.includes("uploaded files") ||
          error.message.includes("file search")
        ) {
          throw new Error(
            "Assistant configuration error: The selections.json file needs to be uploaded to your OpenAI Assistant. Please check the setup instructions."
          );
        }
        if (
          error.message.includes("assistant_id") ||
          error.message.includes("404")
        ) {
          throw new Error(
            "Invalid Assistant ID. Please check your VITE_OPENAI_ASSISTANT_ID environment variable."
          );
        }
        if (
          error.message.includes("401") ||
          error.message.includes("api_key")
        ) {
          throw new Error(
            "Invalid API key. Please check your VITE_OPENAI_API_KEY environment variable."
          );
        }
        const axiosError = error as any;
        if (axiosError.response?.status === 400) {
          throw new Error(`API Request Error: ${JSON.stringify(axiosError.response.data)}`);
        }
        throw new Error(`Search failed: ${error.message}`);
      }

      throw new Error(
        "Failed to search datasets. Please check your OpenAI Assistant configuration."
      );
    }
  }

  async getChatResponse(
    messages: { role: string; content: string }[]
  ): Promise<string> {
    if (!this.isConfiguredValue) {
      throw new Error("OpenAI client not configured");
    }

    try {
      // Create a thread
      const threadResponse = await axios.post(
        `${this.baseURL}/threads`,
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

      // Add all messages to thread (only user messages for assistant API)
      const userMessages = messages.filter((msg) => msg.role === "user");
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (lastUserMessage) {
        await axios.post(
          `${this.baseURL}/threads/${threadId}/messages`,
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
        `${this.baseURL}/threads/${threadId}/runs`,
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

      // Poll for completion - try function calls first, then text
      try {
        const functionCalls = await this.pollRunCompletionForFunctionCalls(
          threadId,
          runId
        );
        if (functionCalls && functionCalls.length > 0) {
          // Convert function calls to a readable response
          return this.convertFunctionCallsToReadableResponse(functionCalls);
        }
      } catch (functionCallError) {
        console.log(
          "No function calls found, trying text response:",
          functionCallError
        );
      }

      // Fallback to regular text completion
      const result = await this.pollRunCompletion(threadId, runId);
      return (
        result ||
        "I apologize, but I was unable to generate a response. Please try rephrasing your question."
      );
    } catch (error) {
      console.error("Error getting chat response:", error);
      throw new Error("Failed to get response from AI assistant");
    }
  }

  private buildSearchPrompt(query: string): string {
    return `
User query: "${query}"

Based on this query, search through the Australian government dataset information in selections.json and suggest the most relevant datasets by calling the suggest_datasets function. Consider:
1. The user's intent and what type of data they might need
2. Keywords and domain areas mentioned in the dataset descriptions
3. Potential use cases and applications
4. Match against dataset IDs and descriptions in the selections.json file

Call the suggest_datasets function with up to 5 most relevant datasets from selections.json, providing their exact IDs and descriptions as they appear in the file.
    `.trim();
  }

  private convertFunctionCallsToSearchResults(
    functionCalls: FunctionCall[]
  ): SearchResult[] {
    const results: SearchResult[] = [];
    console.log("Converting function calls to search results:", JSON.stringify(functionCalls, null, 2));

    functionCalls.forEach((call, index) => {
      console.log(`Processing function call ${index}:`, call.function.name);
      console.log(`Function call arguments:`, JSON.stringify(call.function.arguments, null, 2));
      
      if (call.function.name === "suggest_datasets") {
        let args: SuggestDatasetsArguments;
        
        // Handle both string and object arguments
        if (typeof call.function.arguments === 'string') {
          console.log("Arguments are string, parsing JSON");
          try {
            args = JSON.parse(call.function.arguments);
          } catch (e) {
            console.error("Failed to parse function arguments:", e);
            return;
          }
        } else {
          args = call.function.arguments as SuggestDatasetsArguments;
        }
        
        console.log("Parsed arguments:", JSON.stringify(args, null, 2));
        console.log("Type of args:", typeof args);
        console.log("Keys in args:", args ? Object.keys(args) : 'args is null/undefined');
        
        // Check if args is null or undefined
        if (!args) {
          console.error("Function arguments are null or undefined!");
          return;
        }
        
        // Check if datasets property exists
        if (!('datasets' in args)) {
          console.error("No 'datasets' property in function call arguments! Available keys:", Object.keys(args));
          console.error("Full args structure:", JSON.stringify(args, null, 2));
          return;
        }
        
        if (!args.datasets) {
          console.error("datasets property exists but is null/undefined!");
          return;
        }
        
        if (!Array.isArray(args.datasets)) {
          console.error("args.datasets is not an array:", typeof args.datasets, args.datasets);
          return;
        }
        
        console.log("Processing", args.datasets.length, "datasets");
        args.datasets.forEach((dataset) => {
          results.push({
            datasetId: dataset.id,
            title: this.getDatasetTitleFromId(dataset.id),
            description: dataset.description,
            relevanceScore: 0.9, // High relevance since AI suggested it
            metadata: {
              conceptSchemeId: dataset.id,
              dataflowIdentifier: dataset.id,
              lastUpdated: new Date().toISOString(),
              tags: ["ABS", "suggested"],
            },
          });
        });
      } else if (call.function.name === "query_abs_data_endpoint") {
        const args = call.function.arguments as QueryAbsDataArguments;
        results.push({
          datasetId: `dataset_${index}`,
          title: this.getDatasetTitle(args.dataflow_identifier),
          description: this.getDatasetDescription(
            args.dataflow_identifier,
            args.data_key
          ),
          relevanceScore: 0.8, // Default high relevance since AI selected it
          metadata: {
            conceptSchemeId: args.dataflow_identifier,
            dataflowIdentifier: args.dataflow_identifier,
            dataKey: args.data_key,
            lastUpdated: new Date().toISOString(),
            tags: [this.extractAgencyFromDataflow(args.dataflow_identifier)],
          },
        });
      }
    });

    return results;
  }

  private getDatasetTitle(dataflowId: string): string {
    // Extract a human-readable title from dataflow identifier
    const parts = dataflowId.split(",");
    const mainId = parts[1] || parts[0];
    return (
      mainId
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim() || "ABS Dataset"
    );
  }

  private getDatasetTitleFromId(datasetId: string): string {
    // Convert dataset ID to human-readable title
    return (
      datasetId
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim() || "ABS Dataset"
    );
  }

  private getDatasetDescription(dataflowId: string, dataKey: string): string {
    const title = this.getDatasetTitle(dataflowId);
    return `Australian Bureau of Statistics dataset: ${title}. Data key: ${dataKey}`;
  }

  private extractAgencyFromDataflow(dataflowId: string): string {
    const parts = dataflowId.split(",");
    return parts[0] || "ABS";
  }

  private async pollRunCompletion(
    threadId: string,
    runId: string
  ): Promise<string | null> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const runStatusResponse = await axios.get(
          `${this.baseURL}/threads/${threadId}/runs/${runId}`,
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
            `${this.baseURL}/threads/${threadId}/messages`,
            {
              headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "OpenAI-Beta": "assistants=v2",
              },
            }
          );

          const messages = messagesResponse.data.data;
          const assistantMessage = messages.find(
            (msg: { role: string; content: unknown[] }) =>
              msg.role === "assistant"
          );

          if (assistantMessage && assistantMessage.content[0]?.text?.value) {
            return assistantMessage.content[0].text.value;
          }
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
      } catch (error) {
        console.error("Error polling run status:", error);
        throw error;
      }
    }

    throw new Error("Run timed out");
  }

  private async pollRunCompletionForFunctionCalls(
    threadId: string,
    runId: string
  ): Promise<FunctionCall[]> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const runStatusResponse = await axios.get(
          `${this.baseURL}/threads/${threadId}/runs/${runId}`,
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "OpenAI-Beta": "assistants=v2",
            },
          }
        );

        const status = runStatusResponse.data.status;
        const runData = runStatusResponse.data;
        console.log(`Polling attempt ${attempts + 1}: status = ${status}`);
        if (status === "requires_action") {
          console.log("Run requires action:", JSON.stringify(runData.required_action, null, 2));
        }

        if (status === "completed") {
          // Check if there are function calls in the run
          if (runData.required_action?.type === "submit_tool_outputs") {
            return runData.required_action.submit_tool_outputs.tool_calls || [];
          }

          // If no function calls but completed, get regular messages
          const messagesResponse = await axios.get(
            `${this.baseURL}/threads/${threadId}/messages`,
            {
              headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "OpenAI-Beta": "assistants=v2",
              },
            }
          );

          const messages = messagesResponse.data.data;
          const assistantMessage = messages.find(
            (msg: { role: string; content: unknown[] }) =>
              msg.role === "assistant"
          );

          if (assistantMessage && assistantMessage.content[0]?.text?.value) {
            // Try to extract dataset information from text response
            const textContent = assistantMessage.content[0].text.value;
            return this.parseDatasetSuggestionsFromText(textContent);
          }
        } else if (status === "requires_action") {
          // Handle function calls that require action
          if (runData.required_action?.type === "submit_tool_outputs") {
            const toolCalls =
              runData.required_action.submit_tool_outputs.tool_calls || [];
            console.log(
              "Found function calls requiring action:",
              toolCalls.length
            );

            // For our use case, we just want the dataset suggestions from the function calls
            // We don't need to actually "execute" anything, just extract the data and display it
            console.log("Extracting dataset suggestions from function calls");
            console.log("Raw tool calls from API:", JSON.stringify(toolCalls, null, 2));
            return toolCalls;
          }
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
      } catch (error) {
        console.error("Error polling run status:", error);
        throw error;
      }
    }

    console.error(
      "Function call polling timed out after",
      maxAttempts,
      "attempts"
    );
    throw new Error("Function call polling timed out");
  }

  private convertFunctionCallsToReadableResponse(
    functionCalls: FunctionCall[]
  ): string {
    let response = "I found some relevant datasets for you:\n\n";

    functionCalls.forEach((call, index) => {
      if (call.function.name === "suggest_datasets") {
        const args = call.function.arguments as SuggestDatasetsArguments;
        args.datasets.forEach((dataset, datasetIndex) => {
          response += `${index + datasetIndex + 1}. **${dataset.id}**: ${
            dataset.description
          }\n`;
        });
      } else if (call.function.name === "query_abs_data_endpoint") {
        const args = call.function.arguments as QueryAbsDataArguments;
        response += `${index + 1}. Dataset: ${args.dataflow_identifier} (${
          args.data_key
        })\n`;
      }
    });

    response += "\nYou can click on any dataset card below to view its data.";
    return response;
  }

  private parseDatasetSuggestionsFromText(text: string): FunctionCall[] {
    console.log("Parsing dataset suggestions from text response");

    // Extract dataset IDs and descriptions from the text
    // Pattern: **DATASET_ID**: description
    const datasetPattern = /\*\*([A-Z_0-9]+)\*\*:\s*([^【\n]+)/g;
    const matches = [...text.matchAll(datasetPattern)];

    if (matches.length === 0) {
      console.log("No dataset patterns found in text");
      return [];
    }

    const datasets = matches.map(([, id, description]) => ({
      id: id.trim(),
      description: description.trim(),
    }));

    console.log("Extracted datasets from text:", datasets);

    // Convert to function call format
    return [
      {
        id: "text_extracted_call",
        type: "function",
        function: {
          name: "suggest_datasets",
          arguments: {
            datasets: datasets,
          },
        },
      },
    ];
  }

  isConfigured(): boolean {
    return this.isConfiguredValue;
  }
}

export const openaiAssistantService = new OpenAIAssistantService();
export default openaiAssistantService;
