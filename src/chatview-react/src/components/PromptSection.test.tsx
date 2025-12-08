import { expect, vi } from "vitest";

import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "../tests/test-utils";
import PromptSection from "./PromptSection";

describe("PromptSection", () => {
  const mockProps = {
    value: "Initial prompt",
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

  beforeEach(() => {
    mockProps.onInput.mockClear();
    mockProps.setPopupVisible.mockClear();
    mockProps.onSave.mockClear();
    mockProps.onLoad.mockClear();
    mockProps.onDelete.mockClear();
  });

  it("renders a textarea with correct props and initial value", () => {
    render(<PromptSection {...mockProps} type="system" />);
    const textarea = screen.getByPlaceholderText("Enter prompt...");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("Initial prompt");
    expect(textarea).toHaveAttribute("rows", "3");
  });

  it("updates local state and calls onInput when text is typed", async () => {
    const user = userEvent.setup();
    const onInput = vi.fn();
    render(<PromptSection {...mockProps} type="system" onInput={onInput} />);
    const textarea = screen.getByPlaceholderText("Enter prompt...");

    await user.type(textarea, " new text");
    expect(textarea).toHaveValue("Initial prompt new text");
    expect(onInput).toHaveBeenCalledWith("Initial prompt new text");
  });

  it("preserves local changes when focused, ignoring external value changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PromptSection {...mockProps} type="system" />);
    const textarea = screen.getByPlaceholderText("Enter prompt...");

    fireEvent.focus(textarea);
    await user.type(textarea, " user typed text");
    expect(textarea).toHaveValue("Initial prompt user typed text");

    rerender(
      <PromptSection
        {...mockProps}
        type="system"
        value="External updated prompt"
      />
    );

    expect(textarea).toHaveValue("Initial prompt user typed text");

    fireEvent.blur(textarea);
    await waitFor(() => {
      expect(textarea).toHaveValue("External updated prompt");
    });
  });

  it("updates when value prop changes if not focused", async () => {
    const { rerender } = render(<PromptSection {...mockProps} type="system" />);
    const textarea = screen.getByPlaceholderText("Enter prompt...");

    expect(textarea).toHaveValue("Initial prompt");

    rerender(
      <PromptSection {...mockProps} type="system" value="New external prompt" />
    );

    await waitFor(() => {
      expect(textarea).toHaveValue("New external prompt");
    });
  });

  it("calls onSave when Save button is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PromptSection {...mockProps} type="system" onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("toggles prompts popup when Load button is clicked", async () => {
    const user = userEvent.setup();
    const setPopupVisible = vi.fn();
    render(
      <PromptSection
        {...mockProps}
        type="system"
        setPopupVisible={setPopupVisible}
      />
    );
    await user.click(screen.getByRole("button", { name: "Load" }));
    expect(setPopupVisible).toHaveBeenCalledWith(expect.any(Function));
    expect(setPopupVisible).toHaveBeenCalledTimes(1);
  });

  it("renders PromptsPopup when visible is true", () => {
    render(<PromptSection {...mockProps} type="system" popupVisible={true} />);
    expect(screen.getByText("Saved Prompt 1")).toBeInTheDocument();
    expect(screen.getByText("Saved Prompt 2")).toBeInTheDocument();
  });
});
