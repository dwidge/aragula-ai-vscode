import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import EnabledTools from "./EnabledTools";

describe("EnabledTools", () => {
  it("renders no tools when the tools array is empty", () => {
    render(<EnabledTools tools={[]} onRemoveTool={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "✕" })).not.toBeInTheDocument();
  });

  it("renders a list of enabled tools", () => {
    const tools = ["Tool A", "Tool B", "Tool C"];
    render(<EnabledTools tools={tools} onRemoveTool={vi.fn()} />);

    expect(screen.getByText("Tool A")).toBeInTheDocument();
    expect(screen.getByText("Tool B")).toBeInTheDocument();
    expect(screen.getByText("Tool C")).toBeInTheDocument();

    const removeButtons = screen.getAllByRole("button", { name: "✕" });
    expect(removeButtons).toHaveLength(3);
  });

  it("calls onRemoveTool when a remove button is clicked", async () => {
    const tools = ["Tool A", "Tool B"];
    const mockOnRemoveTool = vi.fn();
    render(<EnabledTools tools={tools} onRemoveTool={mockOnRemoveTool} />);

    const removeButtonA = screen.getAllByRole("button", { name: "✕" })[0];
    await userEvent.click(removeButtonA);

    expect(mockOnRemoveTool).toHaveBeenCalledTimes(1);
    expect(mockOnRemoveTool).toHaveBeenCalledWith("Tool A");

    const removeButtonB = screen.getAllByRole("button", { name: "✕" })[1];
    await userEvent.click(removeButtonB);

    expect(mockOnRemoveTool).toHaveBeenCalledTimes(2);
    expect(mockOnRemoveTool).toHaveBeenCalledWith("Tool B");
  });
});
