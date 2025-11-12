import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import {
  SettingsContextType,
  SettingsProvider,
} from "../contexts/SettingsContext";
import { AIProviderSettings, PlanState, PrivacyPair } from "../types";
import ProviderSettingsPopup from "./ProviderSettingsPopup";

const mockSettings: SettingsContextType = {
  providerSettingsPopupVisible: true,
  setProviderSettingsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  providerSettingsList: [
    {
      name: "Provider A",
      vendor: "OpenAI",
      apiKey: "key-a",
      model: "gpt-3.5-turbo",
      max_tokens: 1000,
      temperature: 0.7,
    },
    {
      name: "Provider B",
      vendor: "Anthropic",
      apiKey: "key-b",
      model: "claude-2",
    },
  ],
  setProviderSettingsList: vi.fn() as React.Dispatch<
    React.SetStateAction<AIProviderSettings[]>
  >,
  currentProviderSetting: undefined,
  setCurrentProviderSetting: vi.fn() as React.Dispatch<
    React.SetStateAction<AIProviderSettings | undefined>
  >,
  editingProviderName: null,
  setEditingProviderName: vi.fn() as React.Dispatch<
    React.SetStateAction<string | null>
  >,
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
  availableVendors: ["OpenAI", "Anthropic", "Google"],
  setAvailableVendors: vi.fn() as React.Dispatch<
    React.SetStateAction<string[]>
  >,
  sendSettingsUpdate: vi.fn() as (settingsPartial: any) => void,
  openFiles: [],
  setOpenFiles: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  systemPrompts: [],
  setSystemPrompts: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  userPrompts: [],
  setUserPrompts: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  availableTools: [],
  setAvailableTools: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  availableShells: [],
  setAvailableShells: vi.fn() as React.Dispatch<
    React.SetStateAction<{ name: string; path: string }[]>
  >,
  enabledTools: [],
  setEnabledTools: vi.fn() as React.Dispatch<React.SetStateAction<string[]>>,
  systemPromptsPopupVisible: false,
  setSystemPromptsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  userPromptsPopupVisible: false,
  setUserPromptsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  toolPopupVisible: false,
  setToolPopupVisible: vi.fn() as React.Dispatch<React.SetStateAction<boolean>>,
  privacySettingsPopupVisible: false,
  setPrivacySettingsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
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

describe("ProviderSettingsPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when providerSettingsPopupVisible is false", () => {
    renderWithSettings(<ProviderSettingsPopup />, {
      ...mockSettings,
      providerSettingsPopupVisible: false,
    });
    expect(screen.queryByText("Providers")).not.toBeInTheDocument();
  });

  it("renders when providerSettingsPopupVisible is true", () => {
    renderWithSettings(<ProviderSettingsPopup />);
    expect(screen.getByText("Providers")).toBeInTheDocument();
    expect(screen.getByText("Provider A")).toBeInTheDocument();
    expect(screen.getByText("Provider B")).toBeInTheDocument();
  });

  it("calls setProviderSettingsPopupVisible when close button is clicked", async () => {
    renderWithSettings(<ProviderSettingsPopup />);
    await userEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(mockSettings.setProviderSettingsPopupVisible).toHaveBeenCalledWith(
      false
    );
  });

  it("calls handleAddProvider when '+' button is clicked", async () => {
    renderWithSettings(<ProviderSettingsPopup />);
    await userEvent.click(screen.getByRole("button", { name: "+" }));
    expect(mockSettings.setEditingProviderName).toHaveBeenCalledWith(null);
    expect(mockSettings.setProviderForm).toHaveBeenCalledWith({
      name: "",
      vendor: "",
      apiKey: "",
      baseURL: "",
      model: "",
      provider: "",
      maxTokens: "",
      temperature: "",
    });
    expect(
      screen.getByRole("heading", { name: "Add Provider" })
    ).toBeInTheDocument();
  });

  it("loads provider data into the form for editing when edit button is clicked", async () => {
    renderWithSettings(<ProviderSettingsPopup />);
    const editButton = screen.getAllByRole("button", { name: "✏️" })[0];
    await userEvent.click(editButton);

    expect(mockSettings.setEditingProviderName).toHaveBeenCalledWith(
      "Provider A"
    );
    expect(mockSettings.setProviderForm).toHaveBeenCalledWith({
      name: "Provider A",
      vendor: "OpenAI",
      apiKey: "key-a",
      baseURL: "",
      model: "gpt-3.5-turbo",
      provider: "",
      maxTokens: "1000",
      temperature: "0.7",
    });
    expect(
      screen.getByRole("heading", { name: "Edit Provider" })
    ).toBeInTheDocument();
  });

  it("saves a new provider", async () => {
    const user = userEvent.setup();
    const newProvider = {
      name: "New Provider",
      vendor: "Google",
      apiKey: "new-key",
      baseURL: "https://example.com",
      model: "gemini-pro",
      provider: "google-ai",
      maxTokens: "2000",
      temperature: "0.5",
    };

    renderWithSettings(<ProviderSettingsPopup />, {
      ...mockSettings,
      providerForm: newProvider,
      editingProviderName: null,
    });

    await user.click(screen.getByRole("button", { name: "+" }));

    const saveButton = screen.getByRole("button", { name: "Save" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSettings.setProviderSettingsList).toHaveBeenCalledWith([
        ...mockSettings.providerSettingsList,
        {
          name: "New Provider",
          vendor: "Google",
          apiKey: "new-key",
          baseURL: "https://example.com",
          model: "gemini-pro",
          provider: "google-ai",
          max_tokens: 2000,
          temperature: 0.5,
        },
      ]);
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        providerList: [
          ...mockSettings.providerSettingsList,
          {
            name: "New Provider",
            vendor: "Google",
            apiKey: "new-key",
            baseURL: "https://example.com",
            model: "gemini-pro",
            provider: "google-ai",
            max_tokens: 2000,
            temperature: 0.5,
          },
        ],
      });
      expect(mockSettings.setProviderSettingsPopupVisible).toHaveBeenCalledWith(
        false
      );
    });
  });

  it("updates an existing provider", async () => {
    const user = userEvent.setup();
    const updatedProvider = {
      name: "Provider A",
      vendor: "OpenAI",
      apiKey: "updated-key-a",
      baseURL: "https://updated.com",
      model: "gpt-4",
      provider: "openai-updated",
      maxTokens: "3000",
      temperature: "0.8",
    };

    renderWithSettings(<ProviderSettingsPopup />, {
      ...mockSettings,
      providerForm: updatedProvider,
      editingProviderName: "Provider A",
      currentProviderSetting: {
        name: "Provider A",
        vendor: "OpenAI",
        apiKey: "key-a",
        model: "gpt-3.5-turbo",
      } as AIProviderSettings,
    });

    await user.click(screen.getAllByRole("button", { name: "✏️" })[0]);

    const saveButton = screen.getByRole("button", { name: "Save" });
    await user.click(saveButton);

    await waitFor(() => {
      const expectedList = [
        {
          name: "Provider A",
          vendor: "OpenAI",
          apiKey: "updated-key-a",
          baseURL: "https://updated.com",
          model: "gpt-4",
          provider: "openai-updated",
          max_tokens: 3000,
          temperature: 0.8,
        },
        mockSettings.providerSettingsList[1],
      ];
      expect(mockSettings.setProviderSettingsList).toHaveBeenCalledWith(
        expectedList
      );
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        providerList: expectedList,
      });
      expect(mockSettings.setCurrentProviderSetting).toHaveBeenCalledWith(
        expectedList[0]
      );
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        providerName: "Provider A",
      });
      expect(mockSettings.setProviderSettingsPopupVisible).toHaveBeenCalledWith(
        false
      );
    });
  });

  it("duplicates a provider", async () => {
    const user = userEvent.setup();
    renderWithSettings(<ProviderSettingsPopup />);

    const duplicateButton = screen.getAllByRole("button", { name: "📄" })[0];
    await user.click(duplicateButton);

    await waitFor(() => {
      expect(mockSettings.setProviderSettingsList).toHaveBeenCalledWith([
        ...mockSettings.providerSettingsList,
        { ...mockSettings.providerSettingsList[0], name: "Provider A Copy" },
      ]);
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        providerList: [
          ...mockSettings.providerSettingsList,
          { ...mockSettings.providerSettingsList[0], name: "Provider A Copy" },
        ],
      });
      expect(mockSettings.setEditingProviderName).toHaveBeenCalledWith(
        "Provider A Copy"
      );
    });
  });

  it("deletes a provider", async () => {
    const user = userEvent.setup();
    renderWithSettings(<ProviderSettingsPopup />, {
      ...mockSettings,
      currentProviderSetting: mockSettings.providerSettingsList[0],
    });

    const deleteButton = screen.getAllByRole("button", { name: "🗑️" })[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockSettings.setProviderSettingsList).toHaveBeenCalledWith([
        mockSettings.providerSettingsList[1],
      ]);
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        providerList: [mockSettings.providerSettingsList[1]],
      });
      expect(mockSettings.setCurrentProviderSetting).toHaveBeenCalledWith(
        undefined
      );
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        providerName: null,
      });
    });
  });

  it("selects a provider when clicking on its list item", async () => {
    const user = userEvent.setup();
    renderWithSettings(<ProviderSettingsPopup />);

    const providerBItem = screen.getByText("Provider B");
    await user.click(providerBItem);

    expect(mockSettings.setCurrentProviderSetting).toHaveBeenCalledWith(
      mockSettings.providerSettingsList[1]
    );
    expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
      providerName: "Provider B",
    });
  });

  it("hides the form and closes popup when cancel button is clicked", async () => {
    const user = userEvent.setup();
    renderWithSettings(<ProviderSettingsPopup />, {
      ...mockSettings,
      providerForm: { ...mockSettings.providerForm, name: "temp" },
    });

    expect(
      screen.getByRole("heading", { name: "Add Provider" })
    ).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(mockSettings.setEditingProviderName).toHaveBeenCalledWith(null);
    expect(mockSettings.setProviderForm).toHaveBeenCalledWith({
      name: "",
      vendor: "",
      apiKey: "",
      baseURL: "",
      model: "",
      provider: "",
      maxTokens: "",
      temperature: "",
    });
    expect(mockSettings.setProviderSettingsPopupVisible).toHaveBeenCalledWith(
      false
    );
  });
});
