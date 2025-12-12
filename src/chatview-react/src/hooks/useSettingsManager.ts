import { useCallback, useRef, useState } from "react";
import { useVscodeApi } from "../contexts/VscodeApiContext";
import { AIProviderSettings, PlanState, PrivacyPair } from "../types";
import { useDebounce } from "./useDebounce";

export const useSettingsManager = (tabId: string) => {
  const { postMessage } = useVscodeApi();

  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<string[]>([]);
  const [userPrompts, setUserPrompts] = useState<string[]>([]);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [availableShells, setAvailableShells] = useState<
    { name: string; path: string }[]
  >([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [providerSettingsList, setProviderSettingsList] = useState<
    AIProviderSettings[]
  >([]);
  const [currentProviderSetting, setCurrentProviderSetting] = useState<
    AIProviderSettings | undefined
  >(undefined);
  const [availableVendors, setAvailableVendors] = useState<string[]>([]);
  const [systemPromptsPopupVisible, setSystemPromptsPopupVisible] =
    useState(false);
  const [userPromptsPopupVisible, setUserPromptsPopupVisible] = useState(false);
  const [toolPopupVisible, setToolPopupVisible] = useState(false);
  const [providerSettingsPopupVisible, setProviderSettingsPopupVisible] =
    useState(false);
  const [privacySettingsPopupVisible, setPrivacySettingsPopupVisible] =
    useState(false);
  const [editingProviderName, setEditingProviderName] = useState<string | null>(
    null
  );
  const [editingPrivacyPairSearch, setEditingPrivacyPairSearch] = useState<
    string | null
  >(null);
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState("");
  const [currentUserPrompt, setCurrentUserPrompt] = useState("");
  const [currentRunCommand, setCurrentRunCommand] = useState("");
  const [currentSelectedShell, setCurrentSelectedShell] = useState("");
  const [autoRemoveComments, setAutoRemoveComments] = useState(true);
  const [autoFormat, setAutoFormat] = useState(true);
  const [autoFixErrors, setAutoFixErrors] = useState(true);
  const [autoGenerateCommit, setAutoGenerateCommit] = useState(false);
  const [useConventionalCommits, setUseConventionalCommits] = useState(false);
  const [includeCodebaseSummary, setIncludeCodebaseSummary] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacyPair[]>([]);
  const [isPrivacyMaskingEnabled, setIsPrivacyMaskingEnabled] = useState(false);
  const [planState, setPlanState] = useState<PlanState>({
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
    tabId,
  });

  const [providerForm, setProviderForm] = useState({
    name: "",
    vendor: "",
    apiKey: "",
    baseURL: "",
    model: "",
    provider: "",
    maxTokens: "",
    temperature: "",
  });

  const [privacyForm, setPrivacyForm] = useState({
    search: "",
    replace: "",
  });

  const userInputRef = useRef<HTMLTextAreaElement>(null);
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const runCommandInputRef = useRef<HTMLInputElement>(null);
  const shellSelectorRef = useRef<HTMLSelectElement>(null);

  const sendSettingsUpdate = useDebounce((settingsPartial: any) => {
    postMessage({
      command: "updateSettings",
      settings: settingsPartial,
    });
  }, 500);

  const updateSystemPrompt = useCallback(
    (value: string) => {
      setCurrentSystemPrompt(value);
      sendSettingsUpdate({ systemPrompt: value });
    },
    [sendSettingsUpdate]
  );

  const updateUserPrompt = useCallback(
    (value: string) => {
      setCurrentUserPrompt(value);
      sendSettingsUpdate({ userPrompt: value });
    },
    [sendSettingsUpdate]
  );

  const updateRunCommand = useCallback(
    (value: string) => {
      setCurrentRunCommand(value);
      sendSettingsUpdate({ runCommand: value });
    },
    [sendSettingsUpdate]
  );

  const updateSelectedShell = useCallback(
    (value: string) => {
      setCurrentSelectedShell(value);
      sendSettingsUpdate({ selectedShell: value });
    },
    [sendSettingsUpdate]
  );

  const saveSystemPrompt = useCallback(() => {
    const prompt = systemPromptRef.current?.value.trim();
    if (prompt && !systemPrompts.includes(prompt)) {
      const newPrompts = [prompt, ...systemPrompts];
      setSystemPrompts(newPrompts);
      sendSettingsUpdate({
        systemPromptList: newPrompts,
      });
    }
  }, [systemPrompts, sendSettingsUpdate]);

  const saveUserPrompt = useCallback(() => {
    const prompt = userInputRef.current?.value.trim();
    if (prompt && !userPrompts.includes(prompt)) {
      const newPrompts = [prompt, ...userPrompts];
      setUserPrompts(newPrompts);
      sendSettingsUpdate({
        userPromptList: newPrompts,
      });
    }
  }, [userPrompts, sendSettingsUpdate]);

  const loadSystemPrompt = useCallback(
    (prompt: string) => {
      if (systemPromptRef.current) systemPromptRef.current.value = prompt;
      updateSystemPrompt(prompt);
      setSystemPromptsPopupVisible(false);
    },
    [updateSystemPrompt]
  );

  const loadUserPrompt = useCallback(
    (prompt: string) => {
      if (userInputRef.current) userInputRef.current.value = prompt;
      updateUserPrompt(prompt);
      setUserPromptsPopupVisible(false);
    },
    [updateUserPrompt]
  );

  const deleteSystemPrompt = useCallback(
    (prompt: string) => {
      const newPrompts = systemPrompts.filter((p) => p !== prompt);
      setSystemPrompts(newPrompts);
      sendSettingsUpdate({
        systemPromptList: newPrompts,
      });
    },
    [systemPrompts, sendSettingsUpdate]
  );

  const deleteUserPrompt = useCallback(
    (prompt: string) => {
      const newPrompts = userPrompts.filter((p) => p !== prompt);
      setUserPrompts(newPrompts);
      sendSettingsUpdate({
        userPromptList: newPrompts,
      });
    },
    [userPrompts, sendSettingsUpdate]
  );

  const removeFile = useCallback(
    (filePath: string) => {
      const newOpenFiles = openFiles.filter((f) => f !== filePath);
      setOpenFiles(newOpenFiles);
      postMessage({
        command: "setWorkspaceSettings",
        data: { openFiles: newOpenFiles },
      });
    },
    [openFiles, postMessage]
  );

  const clearAllFiles = useCallback(() => {
    setOpenFiles([]);
    postMessage({
      command: "setWorkspaceSettings",
      data: { openFiles: [] },
    });
  }, [postMessage]);

  const removeTool = useCallback(
    (tool: string) => {
      setEnabledTools((prev) => prev.filter((t) => t !== tool));
      sendSettingsUpdate({
        enabledTools: enabledTools.filter((t) => t !== tool),
      });
    },
    [enabledTools, sendSettingsUpdate]
  );

  const toggleToolPopup = useCallback(
    () => setToolPopupVisible((prev) => !prev),
    []
  );
  const toggleProviderSettingsPopup = useCallback(
    () => setProviderSettingsPopupVisible((prev) => !prev),
    []
  );
  const togglePrivacySettingsPopup = useCallback(
    () => setPrivacySettingsPopupVisible((prev) => !prev),
    []
  );

  return {
    openFiles,
    setOpenFiles,
    systemPrompts,
    setSystemPrompts,
    userPrompts,
    setUserPrompts,
    availableTools,
    setAvailableTools,
    availableShells,
    setAvailableShells,
    enabledTools,
    setEnabledTools,
    providerSettingsList,
    setProviderSettingsList,
    currentProviderSetting,
    setCurrentProviderSetting,
    availableVendors,
    setAvailableVendors,
    systemPromptsPopupVisible,
    setSystemPromptsPopupVisible,
    userPromptsPopupVisible,
    setUserPromptsPopupVisible,
    toolPopupVisible,
    setToolPopupVisible,
    providerSettingsPopupVisible,
    setProviderSettingsPopupVisible,
    privacySettingsPopupVisible,
    setPrivacySettingsPopupVisible,
    editingProviderName,
    setEditingProviderName,
    editingPrivacyPairSearch,
    setEditingPrivacyPairSearch,
    currentSystemPrompt,
    setCurrentSystemPrompt,
    currentUserPrompt,
    setCurrentUserPrompt,
    currentRunCommand,
    setCurrentRunCommand,
    currentSelectedShell,
    setCurrentSelectedShell,
    autoRemoveComments,
    setAutoRemoveComments,
    autoFormat,
    setAutoFormat,
    autoFixErrors,
    setAutoFixErrors,
    autoGenerateCommit,
    setAutoGenerateCommit,
    useConventionalCommits,
    setUseConventionalCommits,
    includeCodebaseSummary,
    setIncludeCodebaseSummary,
    privacySettings,
    setPrivacySettings,
    isPrivacyMaskingEnabled,
    setIsPrivacyMaskingEnabled,
    planState,
    setPlanState,
    providerForm,
    setProviderForm,
    privacyForm,
    setPrivacyForm,
    sendSettingsUpdate,
    updateSystemPrompt,
    updateUserPrompt,
    updateRunCommand,
    updateSelectedShell,
    saveSystemPrompt,
    saveUserPrompt,
    loadSystemPrompt,
    loadUserPrompt,
    deleteSystemPrompt,
    deleteUserPrompt,
    removeFile,
    clearAllFiles,
    removeTool,
    userInputRef,
    systemPromptRef,
    runCommandInputRef,
    shellSelectorRef,
    postMessage,
    tabId,
    toggleToolPopup,
    toggleProviderSettingsPopup,
    togglePrivacySettingsPopup,
  };
};
