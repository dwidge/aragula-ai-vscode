import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { expect, vi } from "vitest";
import { App } from "./App";
import { VscodeApiProvider } from "./contexts/VscodeApiContext";

// Mock vscode api
const mockPostMessage = vi.fn();

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <VscodeApiProvider value={{ postMessage: mockPostMessage }}>
      {ui}
    </VscodeApiProvider>
  );
};

describe("App", () => {
  beforeEach(() => {
    mockPostMessage.mockClear();
  });

  it("renders the input area and sends a message", async () => {
    const user = userEvent.setup();
    renderWithProvider(<App />);
    await act(() =>
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "settingsUpdated",
            settings: {},
            currentProviderSetting: {
              name: "test-provider",
              vendor: "test",
              apiKey: "test-key",
              model: "test-model",
            },
          },
        })
      )
    );

    const input = screen.getByPlaceholderText("Type your message here...");
    await user.type(input, "Hello");

    const sendButton = screen.getByRole("button", { name: "Send" });
    await user.click(sendButton);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "sendMessage",
        user: "Hello",
      })
    );
  });

  it("displays an error from a 'log' message", () => {
    renderWithProvider(<App />);

    const errorMessage = "This is an error from a log message";
    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "log",
            id: "log-123",
            message: {
              detail: errorMessage,
              // no summary, no type: 'error'
            },
          },
        })
      );
    });

    // The error message should be on the screen.
    // It should be in the summary (preview) and the detail.
    const errorElements = screen.getAllByText(errorMessage);
    expect(errorElements.length).toBeGreaterThan(0);

    // Check if one is a preview
    const previewElement = errorElements.find((el) =>
      el.classList.contains("message-preview")
    );
    expect(previewElement).toBeDefined();
    expect(previewElement).toBeInTheDocument();

    // Check if one is detail text
    const detailElement = errorElements.find((el) =>
      el.classList.contains("message-detail-text")
    );
    expect(detailElement).toBeDefined();
    expect(detailElement).toBeInTheDocument();
  });

  it("displays an error message when an error occurs", () => {
    renderWithProvider(<App />);

    // 1. User sends a message
    const input = screen.getByPlaceholderText("Type your message here...");
    const sendButton = screen.getByRole("button", { name: "Send" });
    act(() => {
      // Add settings to enable send button
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "settingsUpdated",
            settings: {},
            currentProviderSetting: {
              name: "test-provider",
              vendor: "test",
              apiKey: "test-key",
              model: "test-model",
            },
          },
        })
      );
      fireEvent.change(input, { target: { value: "trigger error" } });
      fireEvent.click(sendButton);
    });

    // 2. App receives 'updateMessage' to add a "thinking" message
    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "updateMessage",
            messageId: "thinking-123",
            text: "",
            sender: "assistant" as const,
            messageType: "thinking" as const,
          },
        })
      );
    });

    // 3. App receives 'updateMessage' with the error
    const errorMessage = "API call failed: 401 Incorrect API key";
    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "updateMessage",
            messageId: "thinking-123",
            text: errorMessage,
            sender: "error",
            messageType: "error",
          },
        })
      );
    });

    // The error message should be on the screen
    const errorElements = screen.getAllByText(errorMessage);
    expect(errorElements.length).toBeGreaterThan(0);

    // Find the one that is the detail text
    const detailElement = errorElements.find((el) =>
      el.classList.contains("message-detail-text")
    );
    expect(detailElement).toBeDefined();
    expect(detailElement).toBeInTheDocument();

    const messageContainer = detailElement!.closest("pre");
    expect(messageContainer).toHaveClass("message", "error-message");
    expect(detailElement).toHaveClass("message-detail-text", "error-message");
  });
});
