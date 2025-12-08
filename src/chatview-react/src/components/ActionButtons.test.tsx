import { expect, vi } from "vitest";
import {
  mockPostMessage,
  render,
  screen,
  userEvent,
} from "../tests/test-utils";
import ActionButtons from "./ActionButtons";

describe("ActionButtons", () => {
  beforeEach(() => {
    mockPostMessage.mockClear();
  });

  it("sends a message when send button is clicked", async () => {
    const user = userEvent.setup();
    const userInputRef = { current: document.createElement("textarea") };
    userInputRef.current.value = "Hello";
    const systemPromptRef = { current: document.createElement("textarea") };
    systemPromptRef.current.value = "System Prompt";

    render(<ActionButtons />, {
      providerProps: {
        settingsContext: {
          userInputRef,
          systemPromptRef,
          currentProviderSetting: {
            name: "test",
            vendor: "test",
            apiKey: "test",
            model: "test",
          },
          postMessage: mockPostMessage,
        },
      },
    });

    const sendButton = screen.getByRole("button", { name: "Send" });
    await user.click(sendButton);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "sendMessage",
        user: "Hello",
        system: "System Prompt",
      })
    );
  });

  it("does not clear user input after sending a message", async () => {
    const user = userEvent.setup();
    const initialUserInput = "This is my message.";
    const userInputRef = { current: document.createElement("textarea") };
    userInputRef.current.value = initialUserInput;
    const systemPromptRef = { current: document.createElement("textarea") };
    systemPromptRef.current.value = "System Prompt";
    const updateUserPrompt = vi.fn();

    render(<ActionButtons />, {
      providerProps: {
        settingsContext: {
          userInputRef,
          systemPromptRef,
          currentProviderSetting: {
            name: "test",
            vendor: "test",
            apiKey: "test",
            model: "test",
          },
          postMessage: mockPostMessage,
          updateUserPrompt,
        },
      },
    });

    const sendButton = screen.getByRole("button", { name: "Send" });
    await user.click(sendButton);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(userInputRef.current.value).toBe(initialUserInput);
    expect(updateUserPrompt).not.toHaveBeenCalled();
  });

  it("clears chat history when clear button is clicked", async () => {
    const user = userEvent.setup();
    const mockClearChatHistory = vi.fn();
    render(<ActionButtons variant="compact" />, {
      providerProps: {
        chatContext: {
          clearChatHistory: mockClearChatHistory,
        },
      },
    });

    const clearButton = screen.getByRole("button", { name: "Clear" });
    await user.click(clearButton);

    expect(mockClearChatHistory).toHaveBeenCalledTimes(1);
  });

  it("disables file-related action buttons when no files are open", () => {
    render(<ActionButtons variant="advanced" />, {
      providerProps: {
        settingsContext: {
          openFiles: [],
        },
      },
    });

    expect(
      screen.getByRole("button", { name: "Remove Comments" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Format" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fix Errors" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Commit Files" })).toBeDisabled();
  });

  it("enables file-related action buttons when files are open", () => {
    render(<ActionButtons variant="advanced" />, {
      providerProps: {
        settingsContext: {
          openFiles: ["file1.txt"],
          currentProviderSetting: {
            name: "test",
            vendor: "test",
            apiKey: "test",
            model: "test",
          },
        },
      },
    });

    expect(
      screen.getByRole("button", { name: "Remove Comments" })
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Format" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Fix Errors" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Commit Files" })).toBeEnabled();
  });

  it("disables 'Fix Errors' if no provider is selected, even with files", () => {
    render(<ActionButtons variant="advanced" />, {
      providerProps: {
        settingsContext: {
          openFiles: ["file1.txt"],
          currentProviderSetting: undefined,
        },
      },
    });

    expect(screen.getByRole("button", { name: "Fix Errors" })).toBeDisabled();
  });
});
