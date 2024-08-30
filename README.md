# aragula-ai-vscode

A VSCode assistant that uses tools/function-calling. It runs bash commands and uses some file helpers to discover/read/write code. It uses AI within some of the tools, like cleaning up stdout from a bash command.

## Features

Ask the AI questions about your code or request modifications.

You can ask it to fix code and retry unit tests until they pass.

Select files and right click and choose Ask AI to send them with your prompt.

The extension reads the contents of your open files and provides responses based on the OpenAI API.

Modifications suggested by the AI can be applied to your codebase automatically.

## Requirements

VS Code: This extension requires Visual Studio Code 1.60.0 or higher.
OpenAI API Key: You need to configure an API key for OpenAI to use this extension. Ensure it's set in your VS Code settings under aragula-ai.apiKey.

## Extension Settings

This extension contributes the following settings:

    aragula-ai.apiKey: Set your OpenAI API key here. This is required to use the AI functionalities of the extension.

## Known Issues

API Key Configuration: The extension will not work without a valid OpenAI API key. Ensure it is properly configured.

### Setup issues

If you get this error when you press F5 to start the extension in debug mode:

```
Error: Invalid problemMatcher reference: $esbuild-watch
```

Install the recommended extensions in vscode. It may show a pop up. Or install manually:

```
connor4312.esbuild-problem-matchers
ms-vscode.extension-test-runner
```

## Release Notes

### 0.0.5

    Initial release of the "aragula-ai" extension.
    Features include reading open files, sending content to llm, and receiving responses to modify code.
