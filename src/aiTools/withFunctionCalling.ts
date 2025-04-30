import { Logger } from "../utils/Logger";
import {
  AiApiCaller,
  ToolCall,
  ToolDefinition,
  validateJsonAgainstSchema,
} from "./AiApi";

/**
 * Enhances an AiApiCaller to handle function calls in a loop.
 */

export const withFunctionCalling =
  (apiCaller: AiApiCaller): AiApiCaller =>
  async (
    prompt: {
      user: string;
      system?: string;
      tools?: ToolCall[];
    },
    tools?: ToolDefinition[],
    options?: { logger?: Logger; signal?: AbortSignal }
  ) => {
    const { logger = () => {}, signal } = options ?? {};

    let currentPrompt = { ...prompt };
    let currentTools = tools;
    let finalMessage = "";
    let finalToolCalls: ToolCall[] = [];
    let functionCallLoop = true;

    while (functionCallLoop) {
      if (signal?.aborted) {
        logger("Request aborted before API call.");
        return { assistant: finalMessage, tools: finalToolCalls };
      }
      const apiResponse = await apiCaller(currentPrompt, currentTools, {
        logger,
        signal,
      });
      finalMessage = apiResponse.assistant;
      finalToolCalls = apiResponse.tools;
      functionCallLoop = false;

      if (apiResponse.tools && apiResponse.tools.length > 0 && tools) {
        const functionResults: ToolCall[] = [];
        for (const toolCall of apiResponse.tools) {
          if (signal?.aborted) {
            logger("Request aborted during function call processing.");
            return { assistant: finalMessage, tools: finalToolCalls };
          }
          const toolDefinition = tools.find((t) => t.name === toolCall.name);
          if (toolDefinition && toolDefinition.function) {
            functionCallLoop = true;
            logger(
              `Calling function: ${toolCall.name} with params: ${JSON.stringify(
                toolCall.parameters
              )}`
            );

            if (toolDefinition.parameters && toolCall.parameters) {
              if (
                !validateJsonAgainstSchema(
                  toolCall.parameters,
                  toolDefinition.parameters
                )
              ) {
                throw new Error(
                  `Tool call arguments for ${
                    toolCall.name
                  } do not match schema: ${JSON.stringify(
                    toolDefinition.parameters
                  )}`
                );
              }
            }

            try {
              const functionResponse = await toolDefinition.function(
                toolCall.parameters,
                signal
              );

              if (toolDefinition.response) {
                if (
                  !validateJsonAgainstSchema(
                    functionResponse,
                    toolDefinition.response
                  )
                ) {
                  throw new Error(
                    `Function response for ${
                      toolCall.name
                    } does not match schema: ${JSON.stringify(
                      toolDefinition.response
                    )}`
                  );
                }
              }
              logger(
                `Function ${toolCall.name} returned: ${JSON.stringify(
                  functionResponse
                )}`
              );
              functionResults.push({
                ...toolCall,
                response: functionResponse,
              });
            } catch (error: any) {
              if (error.name === "AbortError") {
                logger(`Function ${toolCall.name} aborted.`);
                return { assistant: finalMessage, tools: finalToolCalls };
              }
              const errorMsg = `Function ${toolCall.name} failed: ${
                error.message || error
              }`;
              logger(errorMsg, "error");
              functionResults.push({
                ...toolCall,
                response: `Error: ${errorMsg}`,
              });
            }
          } else {
            functionCallLoop = false;
            break;
          }
        }

        if (functionCallLoop) {
          const systemMessage = [
            prompt.system,
            `Function call results:`,
            ...functionResults.map(
              (toolCallResult) =>
                `- Tool: ${toolCallResult.name}, Parameters: ${JSON.stringify(
                  toolCallResult.parameters
                )}, Result: ${JSON.stringify(toolCallResult.response)}`
            ),
            `Re-prompting based on function results.`,
          ]
            .filter(Boolean)
            .join("\n");

          currentPrompt = {
            user: prompt.user,
            system: systemMessage,
            tools: functionResults,
          };
          currentTools = tools;
        }
      }
    }

    return { assistant: finalMessage, tools: finalToolCalls };
  };
