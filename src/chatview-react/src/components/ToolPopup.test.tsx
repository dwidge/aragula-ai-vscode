import { expect } from "vitest";
import { render, screen, userEvent, waitFor } from "../tests/test-utils";
import ToolPopup from "./ToolPopup";

describe("ToolPopup", () => {
  it("does not render when toolPopupVisible is false", () => {
    render(<ToolPopup />, {
      providerProps: {
        settingsContext: { toolPopupVisible: false },
      },
    });
    expect(screen.queryByText("Available Tools")).not.toBeInTheDocument();
  });

  it("renders when toolPopupVisible is true", () => {
    render(<ToolPopup />, {
      providerProps: {
        settingsContext: { toolPopupVisible: true },
      },
    });
    expect(screen.getByText("Available Tools")).toBeInTheDocument();
  });

  it("only displays tools that are not already enabled", () => {
    render(<ToolPopup />, {
      providerProps: {
        settingsContext: {
          toolPopupVisible: true,
          availableTools: ["Tool A", "Tool B", "Tool C"],
          enabledTools: ["Tool A"],
        },
      },
    });
    expect(screen.queryByText("Tool A")).not.toBeInTheDocument();
    expect(screen.getByText("Tool B")).toBeInTheDocument();
    expect(screen.getByText("Tool C")).toBeInTheDocument();
  });

  it("calls setToolPopupVisible when close button is clicked", async () => {
    const setToolPopupVisible = vi.fn();
    render(<ToolPopup />, {
      providerProps: {
        settingsContext: {
          toolPopupVisible: true,
          setToolPopupVisible,
        },
      },
    });
    await userEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(setToolPopupVisible).toHaveBeenCalledWith(false);
  });

  it("enables a tool and closes the popup when a tool item is clicked", async () => {
    const user = userEvent.setup();
    const setEnabledTools = vi.fn();
    const sendSettingsUpdate = vi.fn();
    const setToolPopupVisible = vi.fn();

    render(<ToolPopup />, {
      providerProps: {
        settingsContext: {
          toolPopupVisible: true,
          availableTools: ["Tool A", "Tool B"],
          enabledTools: ["Tool A"],
          setEnabledTools,
          sendSettingsUpdate,
          setToolPopupVisible,
        },
      },
    });

    await user.click(screen.getByText("Tool B"));

    await waitFor(() => {
      const expectedTools = ["Tool A", "Tool B"];
      expect(setEnabledTools).toHaveBeenCalledWith(expectedTools);
      expect(sendSettingsUpdate).toHaveBeenCalledWith({
        enabledTools: expectedTools,
      });
      expect(setToolPopupVisible).toHaveBeenCalledWith(false);
    });
  });
});
