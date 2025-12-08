import { expect, vi } from "vitest";
import { render, screen, userEvent } from "../tests/test-utils";
import ActionWithCheckbox from "./ActionWithCheckbox";

describe("ActionWithCheckbox", () => {
  it("renders correctly", () => {
    render(
      <ActionWithCheckbox
        label="Auto Do Thing"
        autoChecked={true}
        onAutoChange={vi.fn()}
        onActionClick={vi.fn()}
        actionLabel="Do Thing"
      />
    );

    expect(screen.getByLabelText("Auto Do Thing")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Do Thing" })
    ).toBeInTheDocument();
  });

  it("calls onAutoChange when checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onAutoChange = vi.fn();
    render(
      <ActionWithCheckbox
        label="Auto Do Thing"
        autoChecked={false}
        onAutoChange={onAutoChange}
        onActionClick={vi.fn()}
        actionLabel="Do Thing"
      />
    );

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(onAutoChange).toHaveBeenCalledWith(true);
  });

  it("calls onActionClick when button is clicked", async () => {
    const user = userEvent.setup();
    const onActionClick = vi.fn();
    render(
      <ActionWithCheckbox
        label="Auto Do Thing"
        autoChecked={false}
        onAutoChange={vi.fn()}
        onActionClick={onActionClick}
        actionLabel="Do Thing"
      />
    );

    const button = screen.getByRole("button");
    await user.click(button);
    expect(onActionClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button when actionDisabled is true", () => {
    render(
      <ActionWithCheckbox
        label="Auto Do Thing"
        autoChecked={false}
        onAutoChange={vi.fn()}
        onActionClick={vi.fn()}
        actionLabel="Do Thing"
        actionDisabled={true}
      />
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
