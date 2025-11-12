import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import {
  SettingsContextType,
  SettingsProvider,
} from "../contexts/SettingsContext";
import { AIProviderSettings, PlanState, PrivacyPair } from "../types";
import PrivacySettingsPopup from "./PrivacySettingsPopup";

const mockSettings: SettingsContextType = {
  privacySettingsPopupVisible: true,
  setPrivacySettingsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  isPrivacyMaskingEnabled: false,
  setIsPrivacyMaskingEnabled: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  privacySettings: [
    { search: "secret1", replace: "MASKED_SECRET1" },
    { search: "token_xyz", replace: "[TOKEN]" },
  ],
  setPrivacySettings: vi.fn() as React.Dispatch<
    React.SetStateAction<PrivacyPair[]>
  >,
  editingPrivacyPairSearch: null,
  setEditingPrivacyPairSearch: vi.fn() as React.Dispatch<
    React.SetStateAction<string | null>
  >,
  privacyForm: { search: "", replace: "" },
  setPrivacyForm: vi.fn() as React.Dispatch<
    React.SetStateAction<{ search: string; replace: string }>
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
  toolPopupVisible: false,
  setToolPopupVisible: vi.fn() as React.Dispatch<React.SetStateAction<boolean>>,
  providerSettingsPopupVisible: false,
  setProviderSettingsPopupVisible: vi.fn() as React.Dispatch<
    React.SetStateAction<boolean>
  >,
  editingProviderName: null,
  setEditingProviderName: vi.fn() as React.Dispatch<
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

describe("PrivacySettingsPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when privacySettingsPopupVisible is false", () => {
    renderWithSettings(<PrivacySettingsPopup />, {
      ...mockSettings,
      privacySettingsPopupVisible: false,
    });
    expect(screen.queryByText("Privacy Settings")).not.toBeInTheDocument();
  });

  it("renders when privacySettingsPopupVisible is true", () => {
    renderWithSettings(<PrivacySettingsPopup />);
    expect(screen.getByText("Privacy Settings")).toBeInTheDocument();
    expect(screen.getByText("Enable Data Masking")).toBeInTheDocument();
    expect(screen.getByText("secret1 → MASKED_SECRET1")).toBeInTheDocument();
  });

  it("calls setPrivacySettingsPopupVisible when close button is clicked", async () => {
    renderWithSettings(<PrivacySettingsPopup />);
    await userEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(mockSettings.setPrivacySettingsPopupVisible).toHaveBeenCalledWith(
      false
    );
  });

  it("toggles enable data masking checkbox and updates settings", async () => {
    renderWithSettings(<PrivacySettingsPopup />);
    const checkbox = screen.getByLabelText("Enable Data Masking");
    expect(checkbox).not.toBeChecked();

    await userEvent.click(checkbox);
    expect(mockSettings.setIsPrivacyMaskingEnabled).toHaveBeenCalledWith(true);
    expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
      isPrivacyMaskingEnabled: true,
    });
  });

  it("displays existing privacy pairs", () => {
    renderWithSettings(<PrivacySettingsPopup />);
    expect(screen.getByText("secret1 → MASKED_SECRET1")).toBeInTheDocument();
    expect(screen.getByText("token_xyz → [TOKEN]")).toBeInTheDocument();
  });

  it("shows 'No masking pairs configured.' when privacySettings is empty", () => {
    renderWithSettings(<PrivacySettingsPopup />, {
      ...mockSettings,
      privacySettings: [],
    });
    expect(
      screen.getByText("No masking pairs configured.")
    ).toBeInTheDocument();
  });

  it("opens the add/edit form when '+' button is clicked", async () => {
    renderWithSettings(<PrivacySettingsPopup />);
    const addButton = screen.getByRole("button", { name: "+" });
    await userEvent.click(addButton);

    expect(mockSettings.setEditingPrivacyPairSearch).toHaveBeenCalledWith(null);
    expect(mockSettings.setPrivacyForm).toHaveBeenCalledWith({
      search: "",
      replace: "",
    });
    expect(
      screen.getByRole("heading", { name: "Add Replacement Pair" })
    ).toBeInTheDocument();
  });

  it("loads a privacy pair into the form for editing when edit button is clicked", async () => {
    renderWithSettings(<PrivacySettingsPopup />);
    const editButton = screen.getAllByRole("button", { name: "✏️" })[0];
    await userEvent.click(editButton);

    expect(mockSettings.setEditingPrivacyPairSearch).toHaveBeenCalledWith(
      "secret1"
    );
    expect(mockSettings.setPrivacyForm).toHaveBeenCalledWith({
      search: "secret1",
      replace: "MASKED_SECRET1",
    });
    expect(
      screen.getByRole("heading", { name: "Edit Replacement Pair" })
    ).toBeInTheDocument();
  });

  it("saves a new privacy pair", async () => {
    const user = userEvent.setup();
    const newPair = { search: "new_secret", replace: "NEW_MASK" };

    renderWithSettings(<PrivacySettingsPopup />, {
      ...mockSettings,
      privacyForm: newPair,
      editingPrivacyPairSearch: null,
    });

    await user.click(screen.getByRole("button", { name: "+" }));

    const saveButton = screen.getByRole("button", { name: "Save" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSettings.setPrivacySettings).toHaveBeenCalledWith([
        ...mockSettings.privacySettings,
        { search: "new_secret", replace: "NEW_MASK" },
      ]);
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        privacySettings: [
          ...mockSettings.privacySettings,
          { search: "new_secret", replace: "NEW_MASK" },
        ],
      });
    });
  });

  it("updates an existing privacy pair", async () => {
    const user = userEvent.setup();
    const initialPair = { search: "secret1", replace: "MASKED_SECRET1" };
    const updatedPair = { search: "secret1", replace: "UPDATED_MASK" };

    renderWithSettings(<PrivacySettingsPopup />, {
      ...mockSettings,
      privacyForm: updatedPair,
      editingPrivacyPairSearch: initialPair.search,
      privacySettings: [
        initialPair,
        { search: "token_xyz", replace: "[TOKEN]" },
      ],
    });

    await user.click(screen.getAllByRole("button", { name: "✏️" })[0]);

    const saveButton = screen.getByRole("button", { name: "Save" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSettings.setPrivacySettings).toHaveBeenCalledWith([
        updatedPair,
        { search: "token_xyz", replace: "[TOKEN]" },
      ]);
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        privacySettings: [
          updatedPair,
          { search: "token_xyz", replace: "[TOKEN]" },
        ],
      });
    });
  });

  it("deletes a privacy pair", async () => {
    const user = userEvent.setup();
    renderWithSettings(<PrivacySettingsPopup />);

    const deleteButton = screen.getAllByRole("button", { name: "🗑️" })[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockSettings.setPrivacySettings).toHaveBeenCalledWith([
        { search: "token_xyz", replace: "[TOKEN]" },
      ]);
      expect(mockSettings.sendSettingsUpdate).toHaveBeenCalledWith({
        privacySettings: [{ search: "token_xyz", replace: "[TOKEN]" }],
      });
    });
  });

  it("hides the form when cancel button is clicked", async () => {
    const user = userEvent.setup();
    renderWithSettings(<PrivacySettingsPopup />, {
      ...mockSettings,
      privacyForm: { search: "temp", replace: "temp" },
    });

    expect(
      screen.getByRole("heading", { name: "Add Replacement Pair" })
    ).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(mockSettings.setEditingPrivacyPairSearch).toHaveBeenCalledWith(null);
    expect(mockSettings.setPrivacyForm).toHaveBeenCalledWith({
      search: "",
      replace: "",
    });
    expect(mockSettings.setPrivacySettingsPopupVisible).toHaveBeenCalledWith(
      false
    );
  });
});
