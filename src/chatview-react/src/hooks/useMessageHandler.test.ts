import { act, fireEvent, renderHook } from "@testing-library/react";
import { expect, vi } from "vitest";
import { useMessageHandler } from "./useMessageHandler";

describe("useMessageHandler", () => {
  it("auto-expands new messages and collapses old ones", () => {
    const setChatHistory = vi.fn();
    const mockProps = {
      setChatHistory,
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
    };

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

    expect(setChatHistory).toHaveBeenCalledTimes(1);
    const firstCallUpdater = setChatHistory.mock.calls[0][0];
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

    expect(setChatHistory).toHaveBeenCalledTimes(2);
    const secondCallUpdater = setChatHistory.mock.calls[1][0];
    const stateAfterSecond = secondCallUpdater(stateAfterFirst);
    expect(stateAfterSecond).toEqual([
      expect.objectContaining({ id: "log-1", isCollapsed: true }),
      expect.objectContaining({ id: "log-2", isCollapsed: false }),
    ]);
  });
});
