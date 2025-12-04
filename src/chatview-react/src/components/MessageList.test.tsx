import { act } from "react";
import { expect, vi } from "vitest";
import MessageList from "../components/MessageList";
import { fireEvent, render, screen } from "../tests/test-utils";

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
});
