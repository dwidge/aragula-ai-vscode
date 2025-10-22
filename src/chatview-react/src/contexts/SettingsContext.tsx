import React, { createContext, ReactNode, useContext } from "react";
import { AIProviderSettings, PlanState, PrivacyPair } from "../types";

interface SettingsContextType {
  openFiles: string[];
  setOpenFiles: React.Dispatch<React.SetStateAction<string[]>>;
  systemPrompts: string[];
  setSystemPrompts: React.Dispatch<React.SetStateAction<string[]>>;
  userPrompts: string[];
  setUserPrompts: React.Dispatch<React.SetStateAction<string[]>>;
  availableTools: string[];
  setAvailableTools: React.Dispatch<React.SetStateAction<string[]>>;
  availableShells: { name: string; path: string }[];
  setAvailableShells: React.Dispatch<
    React.SetStateAction<{ name: string; path: string }[]>
  >;
  enabledTools: string[];
  setEnabledTools: React.Dispatch<React.SetStateAction<string[]>>;
  providerSettingsList: AIProviderSettings[];
  setProviderSettingsList: React.Dispatch<
    React.SetStateAction<AIProviderSettings[]>
  >;
  currentProviderSetting: AIProviderSettings | undefined;
  setCurrentProviderSetting: React.Dispatch<
    React.SetStateAction<AIProviderSettings | undefined>
  >;
  availableVendors: string[];
  setAvailableVendors: React.Dispatch<React.SetStateAction<string[]>>;
  systemPromptsPopupVisible: boolean;
  setSystemPromptsPopupVisible: React.Dispatch<React.SetStateAction<boolean>>;
  userPromptsPopupVisible: boolean;
  setUserPromptsPopupVisible: React.Dispatch<React.SetStateAction<boolean>>;
  toolPopupVisible: boolean;
  setToolPopupVisible: React.Dispatch<React.SetStateAction<boolean>>;
  providerSettingsPopupVisible: boolean;
  setProviderSettingsPopupVisible: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  privacySettingsPopupVisible: boolean;
  setPrivacySettingsPopupVisible: React.Dispatch<React.SetStateAction<boolean>>;
  editingProviderName: string | null;
  setEditingProviderName: React.Dispatch<React.SetStateAction<string | null>>;
  editingPrivacyPairSearch: string | null;
  setEditingPrivacyPairSearch: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  currentSystemPrompt: string;
  setCurrentSystemPrompt: React.Dispatch<React.SetStateAction<string>>;
  currentUserPrompt: string;
  setCurrentUserPrompt: React.Dispatch<React.SetStateAction<string>>;
  currentRunCommand: string;
  setCurrentRunCommand: React.Dispatch<React.SetStateAction<string>>;
  currentSelectedShell: string;
  setCurrentSelectedShell: React.Dispatch<React.SetStateAction<string>>;
  autoRemoveComments: boolean;
  setAutoRemoveComments: React.Dispatch<React.SetStateAction<boolean>>;
  autoFormat: boolean;
  setAutoFormat: React.Dispatch<React.SetStateAction<boolean>>;
  autoFixErrors: boolean;
  setAutoFixErrors: React.Dispatch<React.SetStateAction<boolean>>;
  autoGenerateCommit: boolean;
  setAutoGenerateCommit: React.Dispatch<React.SetStateAction<boolean>>;
  useConventionalCommits: boolean;
  setUseConventionalCommits: React.Dispatch<React.SetStateAction<boolean>>;
  includeCodebaseSummary: boolean;
  setIncludeCodebaseSummary: React.Dispatch<React.SetStateAction<boolean>>;
  privacySettings: PrivacyPair[];
  setPrivacySettings: React.Dispatch<React.SetStateAction<PrivacyPair[]>>;
  isPrivacyMaskingEnabled: boolean;
  setIsPrivacyMaskingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  planState: PlanState;
  setPlanState: React.Dispatch<React.SetStateAction<PlanState>>;
  providerForm: {
    name: string;
    vendor: string;
    apiKey: string;
    baseURL: string;
    model: string;
    provider: string;
    maxTokens: string;
    temperature: string;
  };
  setProviderForm: React.Dispatch<
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
  >;
  privacyForm: {
    search: string;
    replace: string;
  };
  setPrivacyForm: React.Dispatch<
    React.SetStateAction<{
      search: string;
      replace: string;
    }>
  >;
  sendSettingsUpdate: (settingsPartial: any) => void;
  updateSystemPrompt: (value: string) => void;
  updateUserPrompt: (value: string) => void;
  updateRunCommand: (value: string) => void;
  updateSelectedShell: (value: string) => void;
  saveSystemPrompt: () => void;
  saveUserPrompt: () => void;
  loadSystemPrompt: (prompt: string) => void;
  loadUserPrompt: (prompt: string) => void;
  deleteSystemPrompt: (prompt: string) => void;
  deleteUserPrompt: (prompt: string) => void;
  removeFile: (filePath: string) => void;
  removeTool: (tool: string) => void;
  userInputRef: React.RefObject<HTMLTextAreaElement | null>;
  systemPromptRef: React.RefObject<HTMLTextAreaElement | null>;
  runCommandInputRef: React.RefObject<HTMLInputElement | null>;
  shellSelectorRef: React.RefObject<HTMLSelectElement | null>;
  vscode: { postMessage: (v: object) => void };
  tabId: string;
  toggleToolPopup: () => void;
  toggleProviderSettingsPopup: () => void;
  togglePrivacySettingsPopup: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
  value: SettingsContextType;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  value,
}) => {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
