import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the main element", async () => {
    render(<App />);
    const mainElement = await screen.findByRole("main");
    expect(mainElement).toBeInTheDocument();
  });
});
