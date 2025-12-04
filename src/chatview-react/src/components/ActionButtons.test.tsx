import { expect, vi } from "vitest";
import {
  mockPostMessage,
  render,
  screen,
  userEvent,
} from "../tests/test-utils";
import ActionButtons from "./ActionButtons";
import InputArea from "./InputArea";

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

  it("clears chat history when clear button is clicked", async () => {
    const user = userEvent.setup();
    const mockClearChatHistory = vi.fn();
    render(<ActionButtons />, {
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

  it("sends message with user input from InputArea", async () => {
    const user = userEvent.setup();
    render(<InputArea />, {
      providerProps: {
        settingsContext: {
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

    const input = screen.getByPlaceholderText("Type your message here...");
    await user.type(input, "Hello from input");

    const sendButton = screen.getByRole("button", { name: "Send" });
    await user.click(sendButton);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "sendMessage",
        user: "Hello from input",
      })
    );
  });
});
