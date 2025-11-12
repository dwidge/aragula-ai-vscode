import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import SelectedFiles from "./SelectedFiles";

describe("SelectedFiles", () => {
  it("renders no files when the files array is empty", () => {
    render(<SelectedFiles files={[]} onRemoveFile={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "✕" })).not.toBeInTheDocument();
  });

  it("renders a list of selected files", () => {
    const files = ["/path/to/file1.js", "src/Component.tsx", "README.md"];
    render(<SelectedFiles files={files} onRemoveFile={vi.fn()} />);

    expect(screen.getByText("/path/to/file1.js")).toBeInTheDocument();
    expect(screen.getByText("src/Component.tsx")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();

    const removeButtons = screen.getAllByRole("button", { name: "✕" });
    expect(removeButtons).toHaveLength(3);
  });

  it("calls onRemoveFile when a remove button is clicked", async () => {
    const files = ["file1.js", "file2.ts"];
    const mockOnRemoveFile = vi.fn();
    render(<SelectedFiles files={files} onRemoveFile={mockOnRemoveFile} />);

    const removeButton1 = screen.getAllByRole("button", { name: "✕" })[0];
    await userEvent.click(removeButton1);

    expect(mockOnRemoveFile).toHaveBeenCalledTimes(1);
    expect(mockOnRemoveFile).toHaveBeenCalledWith("file1.js");

    const removeButton2 = screen.getAllByRole("button", { name: "✕" })[1];
    await userEvent.click(removeButton2);

    expect(mockOnRemoveFile).toHaveBeenCalledTimes(2);
    expect(mockOnRemoveFile).toHaveBeenCalledWith("file2.ts");
  });
});
