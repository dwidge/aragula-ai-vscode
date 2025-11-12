import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import {
  SettingsContextType,
  SettingsProvider,
} from "../contexts/SettingsContext";
import { AIProviderSettings, PlanState, PrivacyPair } from "../types";
import ToolPopup from "./ToolPopup";

const mockSettings: SettingsContextType = {
  toolPopupVisible: true,
  setToolPopupVisible: vi.fn() as React.Dispatch<React.SetStateAction<boolean>>,
  availableTools: ["Tool A", "Tool B", "Tool C"],
  setAvailableTools: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  enabledTools: ["Tool A"],
  setEnabledTools: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  sendSettingsUpdate: vi.fn() as (settingsPartial: any) => void,
  openFiles: [],
  setOpenFiles: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  systemPrompts: [],
  setSystemPrompts: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  userPrompts: [],
  setUserPrompts: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  availableShells: [],
  setAvailableShells: vi.fn() as React.Dispatch<
    React.SetStateAction<{ name: string; path: string }[]>
  >,
  providerSettingsList: [],
  setProviderSettingsList: vi.fn() as React.Dispatch<
    React.SetStateAction<AIProviderSettings[]>
  >,
  currentProviderSetting: undefined,
  setCurrentProviderSetting: vi.fn() as React.Dispatch<
    React.SetStateAction<AIProviderSettings | undefined>
  >,
  availableVendors: [],
  setAvailableVendors: vi.fn() as React.Dispatch<
    React.SetStateAction<string[]>
  >,
  systemPromptsPopupVisible: false,
  setSystemPromptsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  userPromptsPopupVisible: false,
  setUserPromptsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  providerSettingsPopupVisible: false,
  setProviderSettingsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  privacySettingsPopupVisible: false,
  setPrivacySettingsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  editingProviderName: null,
  setEditingProviderName: vi.fn() as React.Dispatch<
    React.SetStateAction<string | null>
  >,
  editingPrivacyPairSearch: null,
  setEditingPrivacyPairSearch: vi.fn() as React.Dispatch<
    React.SetStateAction<string | null>
  >,
  currentSystemPrompt: "",
  setCurrentSystemPrompt: vi.fn() as React.Dispatch<
    React.SetStateAction<string>
  >,
  currentUserPrompt: "",
  setCurrentUserPrompt: vi.fn() as React.Dispatch<React.SetStateAction<string>>,
  currentRunCommand: "",
  setCurrentRunCommand: vi.fn() as React.Dispatch<React.SetStateAction<string>>,
  currentSelectedShell: "",
  setCurrentSelectedShell: vi.fn() as React.Dispatch<
    React.SetStateAction<string>
  >,
  autoRemoveComments: true,
  setAutoRemoveComments: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  autoFormat: true,
  setAutoFormat: vi.fn() as React.Dispatch<React.SetStateAction<boolean>>,
  autoFixErrors: true,
  setAutoFixErrors: vi.fn() as React.Dispatch<React.SetStateAction<boolean>>,
  autoGenerateCommit: false,
  setAutoGenerateCommit: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  useConventionalCommits: false,
  setUseConventionalCommits: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  includeCodebaseSummary: false,
  setIncludeCodebaseSummary: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  privacySettings: [],
  setPrivacySettings: vi.fn() as React.Dispatch<
    React.SetStateAction<PrivacyPair[]>
  >,
  isPrivacyMaskingEnabled: false,
  setIsPrivacyMaskingEnabled: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  planState: {
    status: "idle",
    currentStepIndex: -1,
    plan: null,
    error: null,
    filePaths: [],
    providerSetting: null,
    autoRemoveComments: true,
    autoFormat: true,
    autoFixErrors: true,
    stepCollapsedStates: [],
    tabId: "test-tab-id",
  },
  setPlanState: vi.fn() as React.Dispatch<React.SetStateAction<PlanState>>,
  providerForm: {
    name: "",
    vendor: "",
    apiKey: "",
    baseURL: "",
    model: "",
    provider: "",
    maxTokens: "",
    temperature: "",
  },
  setProviderForm: vi.fn() as React.Dispatch<
    React.SetStateAction<{
      name: string;
      vendor: string;
      apiKey: string;
      baseURL: string;
      model: string;
      provider: string;
      maxTokens: string;
      temperature: string;
    }>
  >,
  privacyForm: { search: "", replace: "" },
  setPrivacyForm: vi.fn() as React.Dispatch<
    React.SetStateAction<{ search: string; replace: string }>
  >,
  updateSystemPrompt: vi.fn() as (value: string) => void,
  updateUserPrompt: vi.fn() as (value: string) => void,
  updateRunCommand: vi.fn() as (value: string) => void,
  updateSelectedShell: vi.fn() as (value: string) => void,
  saveSystemPrompt: vi.fn() as () => void,
  saveUserPrompt: vi.fn() as () => void,
  loadSystemPrompt: vi.fn() as (prompt: string) => void,
  loadUserPrompt: vi.fn() as (prompt: string) => void,
  deleteSystemPrompt: vi.fn() as (prompt: string) => void,
  deleteUserPrompt: vi.fn() as (prompt: string) => void,
  removeFile: vi.fn() as (filePath: string) => void,
  removeTool: vi.fn() as (tool: string) => void,
  userInputRef: { current: null },
  systemPromptRef: { current: null },
  runCommandInputRef: { current: null },
  shellSelectorRef: { current: null },
  vscode: { postMessage: vi.fn() },
  tabId: "test-tab-id",
  toggleToolPopup: vi.fn() as () => void,
  toggleProviderSettingsPopup: vi.fn() as () => void,
  togglePrivacySettingsPopup: vi.fn() as () => void,
};

const renderWithSettings = (
  ui: React.ReactElement,
  settings: SettingsContextType = mockSettings
) => {
  return render(<SettingsProvider value={settings}>{ui}</SettingsProvider>);
};

describe("ToolPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when toolPopupVisible is false", () => {
    renderWithSettings(<ToolPopup />, {
      ...mockSettings,
      toolPopupVisible: false,
    });
    expect(screen.queryByText("Available Tools")).not.toBeInTheDocument();
  });

  it("renders when toolPopupVisible is true", () => {
    renderWithSettings(<ToolPopup />);
    expect(screen.getByText("Available Tools")).toBeInTheDocument();
  });

  it("only displays tools that are not already enabled", () => {
    renderWithSettings(<ToolPopup />);
    expect(screen.queryByText("Tool A")).not.toBeInTheDocument();
    expect(screen.getByText("Tool B")).toBeInTheDocument();
    expect(screen.getByText("Tool C")).toBeInTheDocument();
  });

  it("calls setToolPopupVisible when close button is clicked", async () => {
    renderWithSettings(<ToolPopup />);
    await userEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(mockSettings.setToolPopupVisible).toHaveBeenCalledWith(false);
  });

  it("enables a tool and closes the popup when a tool item is clicked", async () => {
    const user = userEvent.setup();
    renderWithSettings(<ToolPopup />);

    await user.click(screen.getByText("Tool B"));

    await waitFor(() => {
      expect(mockSettings.setEnabledTools).toHaveBeenCalledWith([
        "Tool A",
        "Tool B",
      ]);
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        enabledTools: ["Tool A", "Tool B"],
      });
      expect(mockSettings.setToolPopupVisible).toHaveBeenCalledWith(false);
    });
  });

  it("does not enable an already enabled tool", async () => {
    const user = userEvent.setup();
    renderWithSettings(<ToolPopup />, {
      ...mockSettings,
      availableTools: ["Tool A", "Tool B"],
      enabledTools: ["Tool A", "Tool B"],
    });

    expect(screen.queryByText("Tool A")).not.toBeInTheDocument();
    expect(screen.queryByText("Tool B")).not.toBeInTheDocument();

    expect(mockSettings.setEnabledTools).not.toHaveBeenCalled();
    expect(mockSettings.sendSettingsUpdate).not.toHaveBeenCalled();
  });
});
