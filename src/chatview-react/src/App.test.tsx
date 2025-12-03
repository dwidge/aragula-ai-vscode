import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { expect, vi } from "vitest";
import { App } from "./App";
import { VscodeApiProvider } from "./contexts/VscodeApiContext";

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
    renderWithProvider(<App tabId="test-tab-id" />);
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
    renderWithProvider(<App tabId="test-tab-id" />);

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
            },
          },
        })
      );
    });

    const errorElements = screen.getAllByText(errorMessage);
    expect(errorElements.length).toBeGreaterThan(0);

    const previewElement = errorElements.find((el) =>
      el.classList.contains("message-preview")
    );
    expect(previewElement).toBeDefined();
    expect(previewElement).toBeInTheDocument();

    const detailElement = errorElements.find((el) =>
      el.classList.contains("message-detail-text")
    );
    expect(detailElement).toBeDefined();
    expect(detailElement).toBeInTheDocument();
  });

  it("displays an error message when an error occurs", () => {
    renderWithProvider(<App tabId="test-tab-id" />);

    const input = screen.getByPlaceholderText("Type your message here...");
    const sendButton = screen.getByRole("button", { name: "Send" });
    act(() => {
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

    const errorElements = screen.getAllByText(errorMessage);
    expect(errorElements.length).toBeGreaterThan(0);

    const detailElement = errorElements.find((el) =>
      el.classList.contains("message-detail-text")
    );
    expect(detailElement).toBeDefined();
    expect(detailElement).toBeInTheDocument();

    const messageContainer = detailElement!.closest("pre");
    expect(messageContainer).toHaveClass("message", "error-message");
    expect(detailElement).toHaveClass("message-detail-text", "error-message");
  });

  it("toggles message collapse state on header click", () => {
    renderWithProvider(<App tabId="test-tab-id" />);

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "log",
            id: "log-1",
            message: { summary: "Test Summary", detail: "Test Detail" },
          },
        })
      );
    });

    const messageHeader = screen
      .getByText("Test Summary")
      .closest(".message-header");
    expect(messageHeader).toBeInTheDocument();

    const collapsibleContent = messageHeader!.nextElementSibling;
    expect(collapsibleContent).not.toHaveClass("collapsed");

    act(() => {
      fireEvent.click(messageHeader!);
    });
    expect(collapsibleContent).toHaveClass("collapsed");

    act(() => {
      fireEvent.click(messageHeader!);
    });
    expect(collapsibleContent).not.toHaveClass("collapsed");
  });

  it("auto-expands new messages and collapses old ones", () => {
    renderWithProvider(<App tabId="test-tab-id" />);

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "log",
            id: "log-1",
            message: { summary: "First Message", detail: "Detail 1" },
          },
        })
      );
    });

    const message1Header = screen
      .getByText("First Message")
      .closest(".message-header");
    const collapsible1 = message1Header!.nextElementSibling;
    expect(collapsible1).not.toHaveClass("collapsed");

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "log",
            id: "log-2",
            message: { summary: "Second Message", detail: "Detail 2" },
          },
        })
      );
    });

    const message2Header = screen
      .getByText("Second Message")
      .closest(".message-header");
    const collapsible2 = message2Header!.nextElementSibling;

    expect(collapsible2).not.toHaveClass("collapsed");
    expect(collapsible1).toHaveClass("collapsed");
  });
});
