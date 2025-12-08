import { act } from "react";
import { expect, vi } from "vitest";
import MessageList from "../components/MessageList";
import { useMessageHandler } from "../hooks/useMessageHandler";
import { fireEvent, render, renderHook, screen } from "../tests/test-utils";

describe("MessageList", () => {
  it("renders a list of messages from the tree", () => {
    const tree = [
      { id: "1", summary: "First message" },
      { id: "2", summary: "Second message" },
    ];
    render(<MessageList />, {
      providerProps: { chatContext: { tree } },
    });
    expect(screen.getByText("First message")).toBeInTheDocument();
    expect(screen.getByText("Second message")).toBeInTheDocument();
  });

  it("displays an error message correctly", () => {
    const errorMessage = "This is an error";
    const tree = [
      {
        id: "error-1",
        summary: errorMessage,
        detail: errorMessage,
        messageType: "error",
      },
    ];
    render(<MessageList />, {
      providerProps: { chatContext: { tree } },
    });

    const errorElements = screen.getAllByText(errorMessage);
    expect(errorElements.length).toBeGreaterThan(0);

    const previewElement = errorElements.find((el) =>
      el.classList.contains("message-preview")
    );
    expect(previewElement).toBeInTheDocument();

    const detailElement = errorElements.find((el) =>
      el.classList.contains("message-detail-text")
    );
    expect(detailElement).toBeInTheDocument();

    const messageContainer = detailElement!.closest("pre");
    expect(messageContainer).toHaveClass("message", "error-message");
  });

  it("toggles message collapse state on header click", () => {
    const mockToggleCollapse = vi.fn();
    const tree = [
      {
        id: "msg-1",
        summary: "Test Summary",
        detail: "Test Detail",
        isCollapsed: false,
      },
    ];

    render(<MessageList />, {
      providerProps: {
        chatContext: {
          tree,
          toggleCollapse: mockToggleCollapse,
        },
      },
    });

    const messageHeader = screen
      .getByText("Test Summary")
      .closest(".message-header");
    expect(messageHeader).toBeInTheDocument();

    act(() => {
      fireEvent.click(messageHeader!);
    });

    expect(mockToggleCollapse).toHaveBeenCalledWith("msg-1");
  });

  it("does not show collapse button for message without details or children", () => {
    const tree = [
      {
        id: "msg-1",
        summary: "No details here",
        detail: "",
        children: [],
      },
    ];
    render(<MessageList />, { providerProps: { chatContext: { tree } } });

    const messageHeader = screen.getByText("No details here");
    expect(messageHeader).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "▲" })).not.toBeInTheDocument();
  });

  it("renders nested child messages under parent with proper indentation", () => {
    const tree = [
      {
        id: "parent-1",
        summary: "Parent Message",
        detail: "Parent detail",
        messageType: "task",
        children: [
          {
            id: "child-1",
            summary: "Child Message 1",
            detail: "Child 1 detail",
            messageType: "log",
          },
          {
            id: "child-2",
            summary: "Child Message 2",
            detail: "Child 2 detail",
            messageType: "info",
          },
        ],
      },
    ];
    render(<MessageList />, {
      providerProps: { chatContext: { tree } },
    });

    expect(screen.getByText("Parent Message")).toBeInTheDocument();
    expect(screen.getByText("task")).toBeInTheDocument();

    const child1 = screen.getByText("Child Message 1");
    const child2 = screen.getByText("Child Message 2");
    expect(child1).toBeInTheDocument();
    expect(child2).toBeInTheDocument();

    const parentHeader = screen
      .getByText("Parent Message")
      .closest(".message-header");
    fireEvent.click(parentHeader!);

    expect(child1).toBeInTheDocument();

    fireEvent.click(parentHeader!);
  });

  it("keeps parent expanded when child is added via message handler", async () => {
    const mockSetChatHistory = vi.fn();
    renderHook(() =>
      useMessageHandler({
        setChatHistory: mockSetChatHistory,
        systemPromptRef: { current: null },
        userInputRef: { current: null },
      })
    );

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "log",
            id: "parent-1",
            message: { summary: "Parent Task", type: "task" },
          },
        })
      );
    });

    expect(mockSetChatHistory).toHaveBeenCalledTimes(1);
    const firstUpdater = mockSetChatHistory.mock.calls[0][0];
    const stateAfterParent = firstUpdater([]);
    expect(stateAfterParent).toEqual([
      expect.objectContaining({
        id: "parent-1",
        summary: "Parent Task",
        messageType: "task",
        isCollapsed: false,
      }),
    ]);

    mockSetChatHistory.mockClear();

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          data: {
            command: "log",
            id: "child-1",
            parentId: "parent-1",
            message: { summary: "Child Log", type: "log" },
          },
        })
      );
    });

    expect(mockSetChatHistory).toHaveBeenCalledTimes(1);
    const secondUpdater = mockSetChatHistory.mock.calls[0][0];
    const stateAfterChild = secondUpdater(stateAfterParent);
    expect(stateAfterChild).toHaveLength(2);
    expect(stateAfterChild[0]).toEqual(
      expect.objectContaining({
        id: "parent-1",
        isCollapsed: false,
      })
    );
    expect(stateAfterChild[1]).toEqual(
      expect.objectContaining({
        id: "child-1",
        parentId: "parent-1",
        isCollapsed: false,
        messageType: "log",
        summary: "Child Log",
      })
    );
  });
});
