import { act, fireEvent, renderHook } from "@testing-library/react";
import { expect, vi } from "vitest";
import { useMessageHandler } from "./useMessageHandler";

describe("useMessageHandler", () => {
  const getMockProps = () => ({
    setChatHistory: vi.fn(),
    setOpenFiles: vi.fn(),
    setCurrentSystemPrompt: vi.fn(),
    setCurrentUserPrompt: vi.fn(),
    setSystemPrompts: vi.fn(),
    setUserPrompts: vi.fn(),
    setProviderSettingsList: vi.fn(),
    setEnabledTools: vi.fn(),
    setAutoRemoveComments: vi.fn(),
    setAutoFormat: vi.fn(),
    setAutoFixErrors: vi.fn(),
    setPrivacySettings: vi.fn(),
    setIsPrivacyMaskingEnabled: vi.fn(),
    setCurrentProviderSetting: vi.fn(),
    setAvailableVendors: vi.fn(),
    setAvailableTools: vi.fn(),
    setAvailableShells: vi.fn(),
    setAutoGenerateCommit: vi.fn(),
    setUseConventionalCommits: vi.fn(),
    setIncludeCodebaseSummary: vi.fn(),
    systemPromptRef: { current: null },
    userInputRef: { current: null },
  });

  it("auto-expands new messages", () => {
    const mockProps = getMockProps();
    renderHook(() => useMessageHandler(mockProps));

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "log",
            id: "log-1",
            message: { summary: "First" },
          },
        })
      );
    });

    expect(mockProps.setChatHistory).toHaveBeenCalledTimes(1);
    const firstCallUpdater = mockProps.setChatHistory.mock.calls[0][0];
    const stateAfterFirst = firstCallUpdater([]);
    expect(stateAfterFirst).toEqual([
      expect.objectContaining({ id: "log-1", isCollapsed: false }),
    ]);

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "log",
            id: "log-2",
            message: { summary: "Second" },
          },
        })
      );
    });

    expect(mockProps.setChatHistory).toHaveBeenCalledTimes(2);
    const secondCallUpdater = mockProps.setChatHistory.mock.calls[1][0];
    const stateAfterSecond = secondCallUpdater(stateAfterFirst);
    expect(stateAfterSecond).toEqual([
      expect.objectContaining({ id: "log-1", isCollapsed: false }),
      expect.objectContaining({ id: "log-2", isCollapsed: false }),
    ]);
  });

  it("handles a 'log' message with an error type", () => {
    const mockProps = getMockProps();
    renderHook(() => useMessageHandler(mockProps));
    const errorMessage = "This is an error from a log message";

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "log",
            id: "log-123",
            message: {
              type: "error",
              summary: errorMessage,
            },
          },
        })
      );
    });

    expect(mockProps.setChatHistory).toHaveBeenCalledTimes(1);
    const updater = mockProps.setChatHistory.mock.calls[0][0];
    const newState = updater([]);
    expect(newState).toEqual([
      expect.objectContaining({
        id: "log-123",
        summary: errorMessage,
        messageType: "error",
      }),
    ]);
  });

  it("handles an 'updateMessage' command with an error type", () => {
    const mockProps = getMockProps();
    renderHook(() => useMessageHandler(mockProps));
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

    expect(mockProps.setChatHistory).toHaveBeenCalledTimes(1);
    const updater = mockProps.setChatHistory.mock.calls[0][0];
    const newState = updater([
      { id: "thinking-123", summary: "Thinking...", messageType: "thinking" },
    ]);
    expect(newState).toEqual([
      expect.objectContaining({
        id: "thinking-123",
        summary: errorMessage,
        detail: errorMessage,
        messageType: "error",
      }),
    ]);
  });
});
