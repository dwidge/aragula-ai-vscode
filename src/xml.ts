/**
 * Represents a parsed XML tool command
 */
type XmlToolCommand = {
  name: string;
  parameters: Record<string, string>;
};

/**
 * Parses XML tool commands into structured data
 * @param xml The XML string containing tool commands
 * @returns Array of parsed tool commands
 */
const parseToolCommands = (xml: string): XmlToolCommand[] => {
  const commands: XmlToolCommand[] = [];

  // Find all top-level tool tags
  const toolTags = ["readDir", "readFile", "writeFile", "runShellCommand"];

  const parseParameters = (
    content: string,
    tagName: string
  ): Record<string, string> => {
    const params: Record<string, string> = {};

    // Parse known parameters based on tag type
    switch (tagName) {
      case "readDir":
        params.directory = extractTagContent(content, "directory");
        break;
      case "readFile":
        params.filePath = extractTagContent(content, "filePath");
        break;
      case "writeFile":
        params.filePath = extractTagContent(content, "filePath");
        params.content = extractTagContent(content, "content");
        break;
      case "runShellCommand":
        params.command = extractTagContent(content, "command");
        const workingDir = extractTagContent(content, "workingDir");
        if (workingDir) {
          params.workingDir = workingDir;
        }
        break;
    }

    return params;
  };

  for (const tag of toolTags) {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
    let match;

    while ((match = regex.exec(xml)) !== null) {
      const content = match[1];
      const params = parseParameters(content, tag);

      commands.push({
        name: tag,
        parameters: params,
      });
    }
  }

  return commands;
};

/**
 * Extracts content from a specific XML tag
 */
const extractTagContent = (xml: string, tagName: string): string => {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "s");
  const match = regex.exec(xml);
  return match ? match[1].trim() : "";
};
