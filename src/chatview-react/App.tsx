/* eslint-disable curly */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./index.css";

declare const tabId: string;
declare function acquireVsCodeApi(): { postMessage: (v: object) => void };
const vscode = acquireVsCodeApi();

const STORAGE_KEYS = {
  chatHistory: `chatMessages-${tabId}`,
  openFiles: `openFiles-${tabId}`,
};

interface ChatMessage {
  id: string;
  parentId?: string;
  summary: string;
  detail?: string;
  sender?: string;
  messageType?: string;
  isCollapsed?: boolean;
  stepIndex?: number;
  text?: string;
  children?: ChatMessage[];
}

interface PrivacyPair {
  search: string;
  replace: string;
}

interface PlanStep {
  description: string;
  subPrompt: string;
  isCollapsed?: boolean;
}

interface AIPlan {
  overallGoal: string;
  steps: PlanStep[];
}

interface PlanState {
  status: "idle" | "planning" | "executing" | "paused" | "failed" | "completed";
  currentStepIndex: number;
  plan: AIPlan | null;
  error: string | null;
  filePaths: string[];
  providerSetting: AiProviderSettings | null;
  autoRemoveComments: boolean;
  autoFormat: boolean;
  autoFixErrors: boolean;
  stepCollapsedStates?: boolean[];
  tabId: string;
}

interface AiProviderSettings {
  name: string;
  vendor: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  provider?: string;
  max_tokens?: number;
  temperature?: number;
}

const App: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<string[]>([]);
  const [userPrompts, setUserPrompts] = useState<string[]>([]);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [availableShells, setAvailableShells] = useState<
    { name: string; path: string }[]
  >([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [providerSettingsList, setProviderSettingsList] = useState<
    AiProviderSettings[]
  >([]);
  const [currentProviderSetting, setCurrentProviderSetting] = useState<
    AiProviderSettings | undefined
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

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userInputRef = useRef<HTMLTextAreaElement>(null);
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const runCommandInputRef = useRef<HTMLInputElement>(null);
  const shellSelectorRef = useRef<HTMLSelectElement>(null);

  /**
   * Clears chat history from memory and localStorage, then re-renders.
   */
  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
    localStorage.removeItem(STORAGE_KEYS.chatHistory);
  }, []);

  useEffect(() => {
    const loadFromLocalStorage = (key: string, defaultValue: any) => {
      const data = localStorage.getItem(key);
      try {
        return data ? JSON.parse(data) : defaultValue;
      } catch (e) {
        console.error(`Error parsing localStorage key ${key}: `, e);
        return defaultValue;
      }
    };

    setChatHistory(loadFromLocalStorage(STORAGE_KEYS.chatHistory, []));
    setOpenFiles(loadFromLocalStorage(STORAGE_KEYS.openFiles, []));
  }, []);

  useEffect(() => {
    return;
    const saveToLocalStorage = (key: string, data: any) => {
      localStorage.setItem(key, JSON.stringify(data));
    };

    const mainHistory = chatHistory.filter((m) =>
      ["user", "assistant", "system"].includes(m.messageType || "")
    );
    saveToLocalStorage(STORAGE_KEYS.chatHistory, mainHistory);
    saveToLocalStorage(STORAGE_KEYS.openFiles, openFiles);
  }, [chatHistory, openFiles]);

  useEffect(() => {
    sendSettingsUpdate({});
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === "log") {
        const { id, parentId, message: taskLog } = message;
        const msgId = String(id);
        const parent = parentId ? String(parentId) : undefined;
        setChatHistory((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === msgId);
          const newMsg: ChatMessage = {
            id: msgId,
            parentId: parent,
            summary: taskLog.summary,
            detail: taskLog.detail,
            messageType: taskLog.type,
            isCollapsed: [
              "prompt",
              "tool",
              "log",
              "info",
              "warning",
              "error",
            ].includes(taskLog.type || "log"),
          };
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...newMsg };
            return updated;
          } else {
            return [...prev, newMsg];
          }
        });
        return;
      }
      switch (message.command) {
        case "promptForm":
          const formId = String(message.formRequest.id);
          const formParentId = message.formRequest.parentId
            ? String(message.formRequest.parentId)
            : undefined;
          setChatHistory((prev) => [
            ...prev,
            {
              id: formId,
              parentId: formParentId,
              summary: message.formRequest.message,
              detail: "",
              messageType: "form-prompt",
              isCollapsed: false,
            },
          ]);
          break;
        case "updateMessage":
          const updateId = String(message.messageId);
          setChatHistory((prev) => {
            const existingIndex = prev.findIndex((m) => m.id === updateId);
            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                detail: message.detail,
                summary: message.summary,
                messageType: message.messageType,
              };
              return updated;
            } else {
              return [
                ...prev,
                {
                  id: updateId,
                  summary: message.summary || "",
                  detail: message.detail || "",
                  sender: message.sender || "",
                  messageType: message.messageType || "log",
                  isCollapsed: false,
                },
              ];
            }
          });
          break;
        case "clearMessages":
          setChatHistory([]);
          break;
        case "setOpenFiles":
          setOpenFiles(message.files);
          break;
        case "addFiles":
          setOpenFiles((prev) => [
            ...prev,
            ...message.filePaths.filter((f: string) => !prev.includes(f)),
          ]);
          break;
        case "settingsUpdated":
          console.log("settingsUpdated1", message);
          setCurrentSystemPrompt(message.settings.systemPrompt || "");
          setCurrentUserPrompt(message.settings.userPrompt || "");
          systemPromptRef.current!.value = message.settings.systemPrompt || "";
          userInputRef.current!.value = message.settings.userPrompt || "";
          setSystemPrompts(message.settings.systemPromptList || []);
          setUserPrompts(message.settings.userPromptList || []);
          setProviderSettingsList(message.settings.providerList || []);
          setEnabledTools(message.settings.enabledTools || []);
          setAutoRemoveComments(message.settings.autoRemoveComments ?? true);
          setAutoFormat(message.settings.autoFormat ?? true);
          setAutoFixErrors(message.settings.autoFixErrors ?? true);
          setPrivacySettings(message.settings.privacySettings || []);
          setIsPrivacyMaskingEnabled(
            message.settings.isPrivacyMaskingEnabled ?? false
          );
          setCurrentProviderSetting(message.currentProviderSetting);
          setAvailableVendors(message.availableVendors || []);
          setAvailableTools(message.availableTools || []);
          setAvailableShells(message.availableShells || []);
          setAutoGenerateCommit(message.settings.autoGenerateCommit ?? false);
          setUseConventionalCommits(
            message.settings.useConventionalCommits ?? false
          );
          setIncludeCodebaseSummary(
            message.settings.includeCodebaseSummary ?? false
          );
          break;
        case "resetSendButton":
          break;
        default:
          console.warn("Unknown command:", message.command);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, scrollToBottom]);

  const buildMessageTree = useCallback((messages: ChatMessage[]) => {
    const messageMap = new Map(messages.map((m) => [m.id, { ...m }]));
    const roots: ChatMessage[] = [];
    messages.forEach((msg) => {
      if (!msg.parentId) {
        roots.push(messageMap.get(msg.id)!);
      } else {
        const parent = messageMap.get(msg.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children!.push(messageMap.get(msg.id)!);
        }
      }
    });
    roots.forEach((root) => {
      if (root.children) {
        root.children.sort((a: ChatMessage, b: ChatMessage) =>
          a.id.localeCompare(b.id)
        );
        root.children.forEach((child: ChatMessage) => {
          if (child.children) {
            child.children.sort((a: ChatMessage, b: ChatMessage) =>
              a.id.localeCompare(b.id)
            );
          }
        });
      }
    });
    return roots;
  }, []);

  const tree = useMemo(
    () => buildMessageTree(chatHistory),
    [chatHistory, buildMessageTree]
  );

  const toggleCollapse = useCallback((id: string) => {
    setChatHistory((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isCollapsed: !(m.isCollapsed || false) } : m
      )
    );
  }, []);

  const renderMessageRecursive = useCallback(
    (msg: ChatMessage & { children?: ChatMessage[] }, level = 0) => (
      <pre
        key={msg.id}
        id={`message-${msg.id}`}
        className={`message ${msg.messageType}-message ${
          level > 0 ? "child-message" : ""
        }`}
        style={{ marginLeft: `${level * 20}px` }}
      >
        <div className="message-content-wrapper">
          <div className="message-header">
            <span className="message-preview">{msg.summary}</span>
            <span className="message-type-badge">{msg.messageType}</span>
            <button className="cancel-button" style={{ display: "none" }}>
              ✕
            </button>
            <button
              className="collapse-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse(msg.id);
              }}
            >
              {msg.isCollapsed ? "▼" : "▲"}
            </button>
          </div>
          <div
            className={`collapsible-content ${
              msg.isCollapsed ? "collapsed" : ""
            }`}
          >
            <div className="message-body-content">
              <div
                className="message-detail-text"
                dangerouslySetInnerHTML={{
                  __html: (msg.detail || "").replace(/\n/g, "<br>"),
                }}
              />
            </div>
            {msg.children && msg.children.length > 0 && (
              <div className="child-messages-container">
                {msg.children.map((child) =>
                  renderMessageRecursive(child, level + 1)
                )}
              </div>
            )}
          </div>
        </div>
      </pre>
    ),
    [toggleCollapse]
  );

  const renderMessages = useCallback(
    () => (
      <div
        id="messages-container"
        ref={messagesContainerRef}
        className="messages-container"
      >
        {tree.map((msg) => renderMessageRecursive(msg))}
      </div>
    ),
    [tree, renderMessageRecursive]
  );

  const debounce = useCallback((func: Function, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  }, []);

  const sendSettingsUpdate = debounce((settingsPartial: any) => {
    vscode.postMessage({
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

  const handleSendMessage = useCallback(() => {
    const user = userInputRef.current?.value.trim() || "";
    const system = systemPromptRef.current?.value.trim() || "";
    if (!user) return;
    if (!currentProviderSetting) return;

    const messageId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: messageId,
      summary: user,
      detail: user,
      sender: "user",
      messageType: "user",
      isCollapsed: false,
    };
    setChatHistory((prev) => [...prev, userMsg]);
    scrollToBottom();

    vscode.postMessage({
      command: "sendMessage",
      user,
      system,
      fileNames: openFiles,
      toolNames: enabledTools,
      providerSetting: currentProviderSetting,
      messageId,
      autoRemoveComments,
      autoFormat,
      autoFixErrors,
      autoGenerateCommit,
      useConventionalCommits,
      privacySettings,
      isPrivacyMaskingEnabled,
      includeCodebaseSummary,
    });

    if (userInputRef.current) userInputRef.current.value = "";
    updateUserPrompt("");
  }, [
    currentProviderSetting,
    openFiles,
    enabledTools,
    autoRemoveComments,
    autoFormat,
    autoFixErrors,
    autoGenerateCommit,
    useConventionalCommits,
    privacySettings,
    isPrivacyMaskingEnabled,
    includeCodebaseSummary,
    updateUserPrompt,
    scrollToBottom,
  ]);

  const handlePlanAndExecute = useCallback(() => {
    const user = userInputRef.current?.value.trim() || "";
    const system = systemPromptRef.current?.value.trim() || "";
    if (!user) return;
    if (!currentProviderSetting) return;

    const messageId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: messageId,
      summary: user,
      detail: user,
      sender: "user",
      messageType: "user",
      isCollapsed: false,
    };
    setChatHistory((prev) => [...prev, userMsg]);
    scrollToBottom();

    vscode.postMessage({
      command: "planAndExecute",
      user,
      system,
      fileNames: openFiles,
      providerSetting: currentProviderSetting,
      autoRemoveComments,
      autoFormat,
      autoFixErrors,
      privacySettings,
      isPrivacyMaskingEnabled,
      messageId,
    });

    if (userInputRef.current) userInputRef.current.value = "";
    updateUserPrompt("");
  }, [
    currentProviderSetting,
    openFiles,
    autoRemoveComments,
    autoFormat,
    autoFixErrors,
    privacySettings,
    isPrivacyMaskingEnabled,
    updateUserPrompt,
    scrollToBottom,
  ]);

  const handleRunCommand = useCallback(() => {
    const command = runCommandInputRef.current?.value.trim();
    if (!command) return;

    vscode.postMessage({
      command: "runCommand",
      runCommand: command,
      shell: currentSelectedShell,
    });
  }, [currentSelectedShell]);

  const handleRemoveComments = useCallback(() => {
    if (openFiles.length === 0) return;
    vscode.postMessage({
      command: "removeCommentsInFiles",
      filePaths: openFiles,
    });
  }, [openFiles]);

  const handleFormat = useCallback(() => {
    if (openFiles.length === 0) return;
    vscode.postMessage({
      command: "formatFilesInFiles",
      filePaths: openFiles,
    });
  }, [openFiles]);

  const handleFixErrors = useCallback(() => {
    if (openFiles.length === 0 || !currentProviderSetting) return;
    vscode.postMessage({
      command: "checkErrorsInFiles",
      filePaths: openFiles,
      providerSetting: currentProviderSetting,
    });
  }, [openFiles, currentProviderSetting]);

  const handleCommitFiles = useCallback(() => {
    if (openFiles.length === 0) return;
    vscode.postMessage({ command: "commitFiles", fileNames: openFiles });
  }, [openFiles]);

  const handleTestTask = useCallback(() => {
    vscode.postMessage({ command: "runTestTask" });
  }, []);

  const handleTestMultiTask = useCallback(() => {
    vscode.postMessage({ command: "runTestMultiTask" });
  }, []);

  const handleTestSerialTask = useCallback(() => {
    vscode.postMessage({ command: "runTestSerialTask" });
  }, []);

  const handleTestFormTask = useCallback(() => {
    vscode.postMessage({ command: "runTestFormTask" });
  }, []);

  const handleTestSetCommitMessage = useCallback(() => {
    vscode.postMessage({ command: "runTestSetCommitMessage" });
  }, []);

  const handleShowCodebaseSummary = useCallback(() => {
    vscode.postMessage({ command: "runShowCodebaseSummary" });
  }, []);

  const renderSelectedFiles = useCallback(
    () => (
      <div id="selected-files-container">
        {openFiles.map((filePath) => (
          <div key={filePath} className="file-button">
            {filePath}
            <button
              className="remove-file-button"
              onClick={() => {
                setOpenFiles((prev) => prev.filter((f) => f !== filePath));
                vscode.postMessage({ command: "removeFile", filePath });
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    ),
    [openFiles]
  );

  const toggleSystemPromptsPopup = useCallback(
    () => setSystemPromptsPopupVisible((prev) => !prev),
    []
  );

  const toggleUserPromptsPopup = useCallback(
    () => setUserPromptsPopupVisible((prev) => !prev),
    []
  );

  const handleSystemPromptInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateSystemPrompt(e.target.value);
    },
    [updateSystemPrompt]
  );

  const handleUserPromptInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateUserPrompt(e.target.value);
    },
    [updateUserPrompt]
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
      systemPromptRef.current!.value = prompt;
      updateSystemPrompt(prompt);
      setSystemPromptsPopupVisible(false);
    },
    [updateSystemPrompt]
  );

  const loadUserPrompt = useCallback(
    (prompt: string) => {
      userInputRef.current!.value = prompt;
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

  const toggleToolPopup = useCallback(
    () => setToolPopupVisible((prev) => !prev),
    []
  );

  const enableTool = useCallback(
    (tool: string) => {
      if (!enabledTools.includes(tool)) {
        setEnabledTools((prev) => [...prev, tool]);
        sendSettingsUpdate({ enabledTools: [...enabledTools, tool] });
      }
      setToolPopupVisible(false);
    },
    [enabledTools, sendSettingsUpdate]
  );

  const removeTool = useCallback(
    (tool: string) => {
      setEnabledTools((prev) => prev.filter((t) => t !== tool));
      sendSettingsUpdate({
        enabledTools: enabledTools.filter((t) => t !== tool),
      });
    },
    [enabledTools, sendSettingsUpdate]
  );

  const toggleProviderSettingsPopup = useCallback(
    () => setProviderSettingsPopupVisible((prev) => !prev),
    []
  );

  const handleAddProvider = useCallback(() => {
    setEditingProviderName(null);
    setProviderForm({
      name: "",
      vendor: "",
      apiKey: "",
      baseURL: "",
      model: "",
      provider: "",
      maxTokens: "",
      temperature: "",
    });
  }, []);

  const loadProviderToForm = useCallback((setting: AiProviderSettings) => {
    setEditingProviderName(setting.name);
    setProviderForm({
      name: setting.name,
      vendor: setting.vendor,
      apiKey: setting.apiKey,
      baseURL: setting.baseURL || "",
      model: setting.model,
      provider: setting.provider || "",
      maxTokens: setting.max_tokens?.toString() || "",
      temperature: setting.temperature?.toString() || "",
    });
  }, []);

  const handleSaveProvider = useCallback(() => {
    const formData = providerForm;
    const setting: AiProviderSettings = {
      name: formData.name.trim(),
      vendor: formData.vendor,
      apiKey: formData.apiKey.trim(),
      baseURL: formData.baseURL.trim() || undefined,
      model: formData.model.trim(),
      provider: formData.provider.trim() || undefined,
      max_tokens: formData.maxTokens
        ? parseInt(formData.maxTokens, 10)
        : undefined,
      temperature: formData.temperature
        ? parseFloat(formData.temperature)
        : undefined,
    };

    if (!setting.name || !setting.vendor || !setting.model) return;

    let newList: AiProviderSettings[];
    if (editingProviderName) {
      newList = providerSettingsList.map((p) =>
        p.name === editingProviderName ? setting : p
      );
    } else {
      newList = [...providerSettingsList, setting];
    }

    setProviderSettingsList(newList);
    sendSettingsUpdate({ providerList: newList });

    if (
      !currentProviderSetting ||
      editingProviderName === currentProviderSetting.name
    ) {
      setCurrentProviderSetting(setting);
      sendSettingsUpdate({ providerName: setting.name });
    }

    handleAddProvider();
    setProviderSettingsPopupVisible(false);
  }, [
    providerForm,
    editingProviderName,
    providerSettingsList,
    currentProviderSetting,
    sendSettingsUpdate,
    handleAddProvider,
  ]);

  const duplicateProvider = useCallback(
    (original: AiProviderSettings) => {
      const newSetting = { ...original, name: `${original.name} Copy` };
      setProviderSettingsList((prev) => [...prev, newSetting]);
      sendSettingsUpdate({
        providerList: [...providerSettingsList, newSetting],
      });
      loadProviderToForm(newSetting);
    },
    [providerSettingsList, sendSettingsUpdate, loadProviderToForm]
  );

  const deleteProvider = useCallback(
    (name: string) => {
      const newList = providerSettingsList.filter((p) => p.name !== name);
      setProviderSettingsList(newList);
      sendSettingsUpdate({ providerList: newList });
      if (currentProviderSetting?.name === name) {
        setCurrentProviderSetting(undefined);
        sendSettingsUpdate({ providerName: null });
      }
      if (editingProviderName === name) {
        handleAddProvider();
      }
    },
    [
      providerSettingsList,
      currentProviderSetting,
      editingProviderName,
      sendSettingsUpdate,
      handleAddProvider,
    ]
  );

  const selectProvider = useCallback(
    (name: string) => {
      const setting = providerSettingsList.find((p) => p.name === name);
      if (setting) {
        setCurrentProviderSetting(setting);
        sendSettingsUpdate({ providerName: name });
      }
    },
    [providerSettingsList, sendSettingsUpdate]
  );

  const togglePrivacySettingsPopup = useCallback(
    () => setPrivacySettingsPopupVisible((prev) => !prev),
    []
  );

  const handleAddPrivacyPair = useCallback(() => {
    setEditingPrivacyPairSearch(null);
    setPrivacyForm({ search: "", replace: "" });
  }, []);

  const loadPrivacyPairToForm = useCallback((pair: PrivacyPair) => {
    setEditingPrivacyPairSearch(pair.search);
    setPrivacyForm({ search: pair.search, replace: pair.replace });
  }, []);

  const handleSavePrivacyPair = useCallback(() => {
    const { search, replace } = privacyForm;
    if (!search.trim()) return;

    let newSettings: PrivacyPair[];
    if (editingPrivacyPairSearch !== null) {
      newSettings = privacySettings.map((p) =>
        p.search === editingPrivacyPairSearch
          ? { search: search.trim(), replace: replace.trim() }
          : p
      );
    } else {
      newSettings = [
        ...privacySettings,
        { search: search.trim(), replace: replace.trim() },
      ];
    }

    setPrivacySettings(newSettings);
    sendSettingsUpdate({ privacySettings: newSettings });
    handleAddPrivacyPair();
    setPrivacySettingsPopupVisible(false);
  }, [
    privacyForm,
    editingPrivacyPairSearch,
    privacySettings,
    sendSettingsUpdate,
    handleAddPrivacyPair,
  ]);

  const deletePrivacyPair = useCallback(
    (search: string) => {
      const newSettings = privacySettings.filter((p) => p.search !== search);
      setPrivacySettings(newSettings);
      sendSettingsUpdate({ privacySettings: newSettings });
      if (editingPrivacyPairSearch === search) {
        handleAddPrivacyPair();
      }
    },
    [
      privacySettings,
      editingPrivacyPairSearch,
      sendSettingsUpdate,
      handleAddPrivacyPair,
    ]
  );

  const handleProviderFormChange = useCallback(
    (field: string, value: string) => {
      setProviderForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handlePrivacyFormChange = useCallback(
    (field: string, value: string) => {
      setPrivacyForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const allowDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const dropHandler = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleAutoGenerateCommitChange = useCallback(
    (checked: boolean) => {
      setAutoGenerateCommit(checked);
      if (!checked) {
        setUseConventionalCommits(false);
        sendSettingsUpdate({
          autoGenerateCommit: checked,
          useConventionalCommits: false,
        });
      } else {
        sendSettingsUpdate({ autoGenerateCommit: checked });
      }
    },
    [sendSettingsUpdate]
  );

  const handleUseConventionalCommitsChange = useCallback(
    (checked: boolean) => {
      setUseConventionalCommits(checked);
      sendSettingsUpdate({ useConventionalCommits: checked });
    },
    [sendSettingsUpdate]
  );

  const handleIncludeCodebaseSummaryChange = useCallback(
    (checked: boolean) => {
      setIncludeCodebaseSummary(checked);
      sendSettingsUpdate({ includeCodebaseSummary: checked });
    },
    [sendSettingsUpdate]
  );

  const handlePrivacyMaskingChange = useCallback(
    (checked: boolean) => {
      setIsPrivacyMaskingEnabled(checked);
      sendSettingsUpdate({ isPrivacyMaskingEnabled: checked });
    },
    [sendSettingsUpdate]
  );
  console.log("tool1", toolPopupVisible, availableTools, enabledTools);

  return (
    <main onDragOver={allowDrop} onDrop={dropHandler}>
      <div id="enabled-tools-container">
        {enabledTools.map((tool) => (
          <div key={tool} className="tool-button">
            {tool}
            <button
              className="remove-tool-button"
              onClick={() => removeTool(tool)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {toolPopupVisible && (
        <div id="tool-popup" className="tool-popup">
          <ul id="tool-popup-list" className="tool-list">
            {availableTools
              .filter((t) => !enabledTools.includes(t))
              .map((tool) => (
                <li
                  key={tool}
                  className="tool-item"
                  onClick={() => enableTool(tool)}
                >
                  {tool}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div id="selected-provider-container">
        {currentProviderSetting && (
          <div className="provider-button">{currentProviderSetting.name}</div>
        )}
      </div>

      {renderSelectedFiles()}

      <div className="input-area">
        <div className="input-row">
          <textarea
            ref={systemPromptRef}
            rows={2}
            placeholder="Edit system prompt here..."
            onInput={handleSystemPromptInput}
            value={currentSystemPrompt}
          />
          <div className="prompt-buttons">
            <button onClick={toggleSystemPromptsPopup}>Load</button>
            <button onClick={saveSystemPrompt}>Save</button>
          </div>
        </div>

        {systemPromptsPopupVisible && (
          <div id="system-prompts-popup" className="prompt-popup">
            <ul id="system-prompts-popup-list" className="prompts-list">
              {systemPrompts.map((prompt) => (
                <li
                  key={prompt}
                  className="prompt-item"
                  onClick={() => loadSystemPrompt(prompt)}
                >
                  <span className="prompt-text">{prompt}</span>
                  <button
                    className="prompt-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSystemPrompt(prompt);
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="input-row">
          <textarea
            ref={userInputRef}
            rows={4}
            placeholder="Type your message here..."
            onInput={handleUserPromptInput}
            value={currentUserPrompt}
          />
          <div className="prompt-buttons">
            <button onClick={toggleUserPromptsPopup}>Load</button>
            <button onClick={saveUserPrompt}>Save</button>
          </div>
        </div>

        {userPromptsPopupVisible && (
          <div id="user-prompts-popup" className="prompt-popup">
            <ul id="user-prompts-popup-list" className="prompts-list">
              {userPrompts.map((prompt) => (
                <li
                  key={prompt}
                  className="prompt-item"
                  onClick={() => loadUserPrompt(prompt)}
                >
                  <span className="prompt-text">{prompt}</span>
                  <button
                    className="prompt-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteUserPrompt(prompt);
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="input-row">
          <input
            ref={runCommandInputRef}
            type="text"
            className="form-input"
            placeholder="Enter command to run..."
            onInput={(e) => updateRunCommand(e.currentTarget.value)}
            value={currentRunCommand}
          />
          <select
            ref={shellSelectorRef}
            className="form-input"
            value={currentSelectedShell}
            onChange={(e) => setCurrentSelectedShell(e.target.value)}
          >
            {availableShells.map((shell) => (
              <option key={shell.path} value={shell.path}>
                {shell.name}
              </option>
            ))}
          </select>
          <button onClick={handleRunCommand}>Run</button>
        </div>

        <div className="button-row">
          <button onClick={handleSendMessage}>Send</button>
          <button onClick={handlePlanAndExecute}>Plan & Execute</button>
          <button onClick={clearChatHistory}>Clear</button>
          <button
            onClick={() => vscode.postMessage({ command: "openFilesDialog" })}
          >
            Add Files
          </button>
          <button onClick={toggleToolPopup}>Add Tool</button>
          <button onClick={toggleProviderSettingsPopup}>Providers</button>
          <div className="auto-checkbox">
            <input
              type="checkbox"
              checked={autoRemoveComments}
              onChange={(e) => {
                setAutoRemoveComments(e.target.checked);
                sendSettingsUpdate({ autoRemoveComments: e.target.checked });
              }}
            />
            <label>Auto Remove Comments</label>
          </div>
          <button onClick={handleRemoveComments}>Remove Comments</button>
          <div className="auto-checkbox">
            <input
              type="checkbox"
              checked={autoFormat}
              onChange={(e) => {
                setAutoFormat(e.target.checked);
                sendSettingsUpdate({ autoFormat: e.target.checked });
              }}
            />
            <label>Auto Format</label>
          </div>
          <button onClick={handleFormat}>Format</button>
          <div className="auto-checkbox">
            <input
              type="checkbox"
              checked={autoFixErrors}
              onChange={(e) => {
                setAutoFixErrors(e.target.checked);
                sendSettingsUpdate({ autoFixErrors: e.target.checked });
              }}
            />
            <label>Auto Fix Errors</label>
          </div>
          <button onClick={handleFixErrors}>Fix Errors</button>
          <div className="auto-checkbox">
            <input
              type="checkbox"
              checked={autoGenerateCommit}
              onChange={(e) => handleAutoGenerateCommitChange(e.target.checked)}
            />
            <label>Generate Commit Message</label>
          </div>
          <div className="auto-checkbox">
            <input
              type="checkbox"
              checked={useConventionalCommits}
              disabled={!autoGenerateCommit}
              onChange={(e) =>
                handleUseConventionalCommitsChange(e.target.checked)
              }
            />
            <label>Use Conventional Commits</label>
          </div>
          <button onClick={handleCommitFiles}>Commit Files</button>
          <button onClick={handleTestTask}>Test Task Logger</button>
          <button onClick={handleTestMultiTask}>Test Multi Task</button>
          <button onClick={handleTestSerialTask}>Test Serial Task</button>
          <button onClick={handleTestFormTask}>Test Form Task</button>
          <button onClick={handleTestSetCommitMessage}>
            Test Set Commit Message
          </button>
          <button onClick={handleShowCodebaseSummary}>
            Show Codebase Summary
          </button>
          <div className="auto-checkbox">
            <input
              type="checkbox"
              checked={includeCodebaseSummary}
              onChange={(e) =>
                handleIncludeCodebaseSummaryChange(e.target.checked)
              }
            />
            <label>Include Codebase Summary</label>
          </div>
          <button onClick={togglePrivacySettingsPopup}>Privacy</button>
        </div>
      </div>

      {providerSettingsPopupVisible && (
        <div id="provider-popup" className="provider-popup">
          <div className="provider-popup-header">
            <span>Providers</span>
            <button className="add-provider-button" onClick={handleAddProvider}>
              +
            </button>
          </div>
          <ul id="provider-popup-list" className="provider-list">
            {providerSettingsList.map((setting) => (
              <li
                key={setting.name}
                className="provider-item"
                onClick={() => selectProvider(setting.name)}
              >
                <span className="prompt-text">{setting.name}</span>
                <button
                  className="duplicate-provider-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateProvider(setting);
                  }}
                >
                  📄
                </button>
                <button
                  className="select-provider-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadProviderToForm(setting);
                  }}
                >
                  ✏️
                </button>
                <button
                  className="prompt-delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProvider(setting.name);
                  }}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
          <div id="provider-form" className="provider-form">
            <h3>{editingProviderName ? "Edit" : "Add"} Provider</h3>
            <label>Name:</label>
            <input
              type="text"
              value={providerForm.name}
              onChange={(e) => handleProviderFormChange("name", e.target.value)}
            />
            <label>Vendor:</label>
            <select
              value={providerForm.vendor}
              onChange={(e) =>
                handleProviderFormChange("vendor", e.target.value)
              }
            >
              <option value="">Select Vendor</option>
              {availableVendors.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor}
                </option>
              ))}
            </select>
            <label>API Key:</label>
            <input
              type="text"
              value={providerForm.apiKey}
              onChange={(e) =>
                handleProviderFormChange("apiKey", e.target.value)
              }
            />
            <label>Base URL (optional):</label>
            <input
              type="text"
              value={providerForm.baseURL}
              onChange={(e) =>
                handleProviderFormChange("baseURL", e.target.value)
              }
            />
            <label>Model:</label>
            <input
              type="text"
              value={providerForm.model}
              onChange={(e) =>
                handleProviderFormChange("model", e.target.value)
              }
            />
            <label>Provider (optional):</label>
            <input
              type="text"
              value={providerForm.provider}
              onChange={(e) =>
                handleProviderFormChange("provider", e.target.value)
              }
            />
            <label>Max Tokens (optional):</label>
            <input
              type="number"
              value={providerForm.maxTokens}
              onChange={(e) =>
                handleProviderFormChange("maxTokens", e.target.value)
              }
            />
            <label>Temperature (optional, 0-2):</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={providerForm.temperature}
              onChange={(e) =>
                handleProviderFormChange("temperature", e.target.value)
              }
            />
            <div className="provider-form-buttons">
              <button onClick={handleSaveProvider}>Save</button>
              <button onClick={handleAddProvider}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {privacySettingsPopupVisible && (
        <div id="privacy-popup" className="privacy-popup">
          <div className="privacy-popup-header">
            <span>Privacy Settings</span>
            <button
              className="add-privacy-pair-button"
              onClick={handleAddPrivacyPair}
            >
              +
            </button>
          </div>
          <div className="auto-checkbox" style={{ marginBottom: "10px" }}>
            <input
              type="checkbox"
              checked={isPrivacyMaskingEnabled}
              onChange={(e) => handlePrivacyMaskingChange(e.target.checked)}
            />
            <label>Enable Data Masking</label>
          </div>
          <ul id="privacy-popup-list" className="privacy-list">
            {privacySettings.length === 0 ? (
              <li style={{ textAlign: "center", padding: "10px" }}>
                No masking pairs configured.
              </li>
            ) : (
              privacySettings.map((pair) => (
                <li key={pair.search} className="privacy-item">
                  <span className="prompt-text">
                    {pair.search} → {pair.replace}
                  </span>
                  <div>
                    <button
                      className="edit-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadPrivacyPairToForm(pair);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePrivacyPair(pair.search);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
          <div
            id="privacy-form"
            className="privacy-form"
            style={{
              display:
                editingPrivacyPairSearch !== null || privacyForm.search
                  ? "block"
                  : "none",
            }}
          >
            <h3>
              {editingPrivacyPairSearch ? "Edit" : "Add"} Replacement Pair
            </h3>
            <label>Sensitive String (Search):</label>
            <input
              type="text"
              value={privacyForm.search}
              onChange={(e) =>
                handlePrivacyFormChange("search", e.target.value)
              }
            />
            <label>Dummy Placeholder (Replace):</label>
            <input
              type="text"
              value={privacyForm.replace}
              onChange={(e) =>
                handlePrivacyFormChange("replace", e.target.value)
              }
            />
            <div className="privacy-form-buttons">
              <button onClick={handleSavePrivacyPair}>Save</button>
              <button onClick={handleAddPrivacyPair}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {renderMessages()}
    </main>
  );
};

export default App;
