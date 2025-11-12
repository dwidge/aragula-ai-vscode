import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect } from "vitest";
import SelectedProvider from "./SelectedProvider";

describe("SelectedProvider", () => {
  it("renders nothing when no provider is selected", () => {
    render(<SelectedProvider provider={undefined} />);
    expect(screen.queryByText(/Provider/i)).not.toBeInTheDocument();
  });

  it("renders the name of the selected provider", () => {
    const mockProvider = {
      name: "My Test Provider",
      vendor: "OpenAI",
      apiKey: "test-key",
      model: "gpt-4",
    };
    render(<SelectedProvider provider={mockProvider} />);
    expect(screen.getByText("My Test Provider")).toBeInTheDocument();
  });

  it("renders a different provider name when a different provider is passed", () => {
    const anotherProvider = {
      name: "Anthropic Claude",
      vendor: "Anthropic",
      apiKey: "claude-key",
      model: "claude-3-opus",
    };
    render(<SelectedProvider provider={anotherProvider} />);
    expect(screen.getByText("Anthropic Claude")).toBeInTheDocument();
    expect(screen.queryByText("My Test Provider")).not.toBeInTheDocument();
  });
});
