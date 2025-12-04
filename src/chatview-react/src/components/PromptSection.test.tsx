import { expect, vi } from "vitest";
import { render, screen, userEvent } from "../tests/test-utils";
import PromptSection from "./PromptSection";

describe("PromptSection", () => {
  const mockProps = {
    value: "Test prompt",
    onInput: vi.fn(),
    inputRef: { current: null },
    prompts: ["Saved Prompt 1", "Saved Prompt 2"],
    popupVisible: false,
    setPopupVisible: vi.fn(),
    onSave: vi.fn(),
    onLoad: vi.fn(),
    onDelete: vi.fn(),
    rows: 3,
    placeholder: "Enter prompt...",
  };

  it("renders a textarea with correct props", () => {
    render(<PromptSection {...mockProps} type="system" />);
    const textarea = screen.getByPlaceholderText("Enter prompt...");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("Test prompt");
    expect(textarea).toHaveAttribute("rows", "3");
  });

  it("calls onInput when text is typed", async () => {
    const onInput = vi.fn();
    render(<PromptSection {...mockProps} type="system" onInput={onInput} />);
    const textarea = screen.getByPlaceholderText("Enter prompt...");
    await userEvent.type(textarea, "a");
    expect(onInput).toHaveBeenCalledWith("Test prompta");
  });

  it("calls onSave when Save button is clicked", async () => {
    const onSave = vi.fn();
    render(<PromptSection {...mockProps} type="system" onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalled();
  });

  it("toggles prompts popup when Load button is clicked", async () => {
    const setPopupVisible = vi.fn();
    render(
      <PromptSection
        {...mockProps}
        type="system"
        setPopupVisible={setPopupVisible}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(setPopupVisible).toHaveBeenCalled();
  });

  it("renders PromptsPopup when visible is true", () => {
    render(<PromptSection {...mockProps} type="system" popupVisible={true} />);
    expect(screen.getByText("Saved Prompt 1")).toBeInTheDocument();
    expect(screen.getByText("Saved Prompt 2")).toBeInTheDocument();
  });
});
