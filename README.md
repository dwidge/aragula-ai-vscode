# aragula-ai

This Visual Studio Code extension integrates with OpenAI's API to assist with code analysis and modifications based on natural language queries.

## Features

AI-Powered Code Assistance: Ask the AI questions about your code or request modifications. The extension reads the contents of your open files and provides responses based on the OpenAI API.
Interactive Chat Window: Opens a webview panel where you can interact with the AI and receive responses directly within VS Code.
Automatic File Updates: Modifications suggested by the AI can be applied to your codebase automatically.

## Requirements

VS Code: This extension requires Visual Studio Code 1.60.0 or higher.
OpenAI API Key: You need to configure an API key for OpenAI to use this extension. Ensure it's set in your VS Code settings under aragula-ai.apiKey.

## Extension Settings

This extension contributes the following settings:

    aragula-ai.apiKey: Set your OpenAI API key here. This is required to use the AI functionalities of the extension.

## Known Issues

API Key Configuration: The extension will not work without a valid OpenAI API key. Ensure it is properly configured.

### Setup issues

If you get this error when you press F5 to start:

```
Error: Invalid problemMatcher reference: $esbuild-watch
```

Install the recommended extensions in vscode. It may show a pop up. Or install manually:

```
connor4312.esbuild-problem-matchers
ms-vscode.extension-test-runner
```

## Release Notes

### 1.0.0

    Initial release of the "aragula-ai" extension.
    Features include reading open files, sending content to OpenAI, and receiving responses to modify code.
