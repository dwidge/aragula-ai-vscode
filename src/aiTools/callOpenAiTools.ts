import OpenAI from "openai";
import { getConfig } from "../config";
import { PromptAi, ToolContext, ToolDef, ToolSchema } from "./ToolTypes";

type OpenAiTool = {
  type: "function";
  function: {
    strict: true;
    name?: string;
    description: string;
    function: (args: any) => any;
    parse: (input: string) => any;
    parameters: ToolSchema;
  };
};

export const callOpenAiTools =
  (openai: OpenAI): PromptAi =>
  async (
    c: ToolContext,
    {
      user,
      system,
      tools,
    }: { user: string; system?: string; tools?: ToolDef[] },
    jsonTools = tools?.filter((t) => !t.type || t.type === "json"),
    xmlTools = tools?.filter((t) => t.type === "xml"),
    xmlToolPrompts = xmlTools?.map(createToolSystemPrompt) ?? [],
    combinedSystemPrompt = [
      "# Use these tools only:",
      ...xmlToolPrompts,
      system,
    ]
      .filter(Boolean)
      .join("\n\n")
  ): Promise<string> =>
    jsonTools?.length
      ? (await openai.beta.chat.completions
          .runTools({
            ...getConfig(),
            messages: combinedSystemPrompt
              ? [
                  { content: combinedSystemPrompt, role: "system" },
                  { content: user, role: "user" },
                ]
              : [{ content: user, role: "user" }],
            tools: jsonTools.map(
              (t): OpenAiTool => ({
                type: "function",
                function: {
                  ...t,
                  name: t.name,
                  strict: true,
                  function: (args: any) => t.function(c, args),
                  parse: JSON.parse,
                },
              })
            ),
          })
          .on("message", (message) => console.log(message))
          .finalContent()) ?? ""
      : (
          await openai.chat.completions.create({
            ...getConfig(),
            messages: combinedSystemPrompt
              ? [
                  { content: combinedSystemPrompt, role: "system" },
                  { content: user, role: "user" },
                ]
              : [{ content: user, role: "user" }],
          })
        ).choices[0]?.message?.content?.trim() ?? "";

const createToolSystemPrompt = (tool: ToolDef): string => `
<${tool.name}>
${Object.entries(tool.parameters.properties ?? {})
  .map(([k, v]) => `<${k}>${v.description ?? v.type}</${k}>`)
  .join("\n")}
</${tool.name}>
`;
