import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.stubGlobal("acquireVsCodeApi", () => ({
  postMessage: vi.fn(),
}));

vi.stubGlobal("tabId", "test-tab-id");
