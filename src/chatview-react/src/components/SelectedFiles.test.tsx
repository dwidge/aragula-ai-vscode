import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import SelectedFiles from "./SelectedFiles";

const clearAllAriaLabel = "Clear all selected files";
const filterAriaLabel = "Filter relevant files using current prompt";

describe("SelectedFiles", () => {
  it("renders no files when the files array is empty", () => {
    render(<SelectedFiles files={[]} onRemoveFile={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: /Remove/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: clearAllAriaLabel })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: filterAriaLabel })
    ).not.toBeInTheDocument();
  });

  it("renders a list of selected files", () => {
    const files = ["/path/to/file1.js", "src/Component.tsx", "README.md"];
    render(<SelectedFiles files={files} onRemoveFile={vi.fn()} />);

    expect(screen.getByText("/path/to/file1.js")).toBeInTheDocument();
    expect(screen.getByText("src/Component.tsx")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();

    const removeButtons = screen.getAllByRole("button", { name: /Remove/ });
    expect(removeButtons).toHaveLength(3);
  });

  it("calls onRemoveFile when a remove button is clicked", async () => {
    const files = ["file1.js", "file2.ts"];
    const mockOnRemoveFile = vi.fn();
    render(<SelectedFiles files={files} onRemoveFile={mockOnRemoveFile} />);

    const removeButton1 = screen.getAllByRole("button", {
      name: /Remove file1.js/,
    })[0];
    await userEvent.click(removeButton1);

    expect(mockOnRemoveFile).toHaveBeenCalledTimes(1);
    expect(mockOnRemoveFile).toHaveBeenCalledWith("file1.js");

    const removeButton2 = screen.getAllByRole("button", {
      name: /Remove file2.ts/,
    })[0];
    await userEvent.click(removeButton2);

    expect(mockOnRemoveFile).toHaveBeenCalledTimes(2);
    expect(mockOnRemoveFile).toHaveBeenCalledWith("file2.ts");
  });

  it("renders clear all button when files are present and onClearAll is provided", () => {
    const files = ["file1.js"];
    const mockOnClearAll = vi.fn();
    render(
      <SelectedFiles
        files={files}
        onRemoveFile={vi.fn()}
        onClearAll={mockOnClearAll}
      />
    );

    expect(
      screen.getByRole("button", { name: clearAllAriaLabel })
    ).toBeInTheDocument();
  });

  it("renders filter button when files are present and onFilter is provided", () => {
    const files = ["file1.js"];
    const mockOnFilter = vi.fn();
    render(
      <SelectedFiles
        files={files}
        onRemoveFile={vi.fn()}
        onFilter={mockOnFilter}
      />
    );

    expect(
      screen.getByRole("button", { name: filterAriaLabel })
    ).toBeInTheDocument();
  });

  it("does not render clear all button when no files", () => {
    render(
      <SelectedFiles files={[]} onRemoveFile={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(
      screen.queryByRole("button", { name: clearAllAriaLabel })
    ).not.toBeInTheDocument();
  });

  it("does not render filter button when no files", () => {
    render(
      <SelectedFiles files={[]} onRemoveFile={vi.fn()} onFilter={vi.fn()} />
    );
    expect(
      screen.queryByRole("button", { name: filterAriaLabel })
    ).not.toBeInTheDocument();
  });

  it("does not render clear all button when onClearAll not provided", () => {
    render(<SelectedFiles files={["file1.js"]} onRemoveFile={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: clearAllAriaLabel })
    ).not.toBeInTheDocument();
  });

  it("does not render filter button when onFilter not provided", () => {
    render(<SelectedFiles files={["file1.js"]} onRemoveFile={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: filterAriaLabel })
    ).not.toBeInTheDocument();
  });

  it("calls onClearAll when clear all button is clicked", async () => {
    const files = ["file1.js", "file2.ts"];
    const mockOnClearAll = vi.fn();
    render(
      <SelectedFiles
        files={files}
        onRemoveFile={vi.fn()}
        onClearAll={mockOnClearAll}
      />
    );

    const clearButton = screen.getByRole("button", {
      name: clearAllAriaLabel,
    });
    await userEvent.click(clearButton);

    expect(mockOnClearAll).toHaveBeenCalledTimes(1);
  });

  it("calls onFilter when filter button is clicked", async () => {
    const files = ["file1.js", "file2.ts"];
    const mockOnFilter = vi.fn();
    render(
      <SelectedFiles
        files={files}
        onRemoveFile={vi.fn()}
        onFilter={mockOnFilter}
      />
    );

    const filterButton = screen.getByRole("button", {
      name: filterAriaLabel,
    });
    await userEvent.click(filterButton);

    expect(mockOnFilter).toHaveBeenCalledTimes(1);
  });

  it("clicking clear all does not call onRemoveFile", async () => {
    const files = ["file1.js"];
    const mockOnRemoveFile = vi.fn();
    const mockOnClearAll = vi.fn();
    render(
      <SelectedFiles
        files={files}
        onRemoveFile={mockOnRemoveFile}
        onClearAll={mockOnClearAll}
      />
    );

    const clearButton = screen.getByRole("button", {
      name: clearAllAriaLabel,
    });
    await userEvent.click(clearButton);

    expect(mockOnRemoveFile).not.toHaveBeenCalled();
    expect(mockOnClearAll).toHaveBeenCalledTimes(1);
  });

  it("renders both clear all and filter buttons when both provided and files present", () => {
    const files = ["file1.js"];
    render(
      <SelectedFiles
        files={files}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
        onFilter={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: clearAllAriaLabel })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: filterAriaLabel })
    ).toBeInTheDocument();
  });
});
