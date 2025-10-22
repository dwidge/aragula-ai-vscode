import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary";
import InputArea from "./components/InputArea";
import MessageList from "./components/MessageList";
import { ChatProvider } from "./contexts/ChatContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { useDebounce } from "./hooks/useDebounce";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useMessageTree } from "./hooks/useMessageTree";
import { useScrollToBottom } from "./hooks/useScrollToBottom";
import {
  AIProviderSettings,
  ChatMessage,
  PlanState,
  PrivacyPair,
} from "./types";

declare const tabId: string;
declare function acquireVsCodeApi(): { postMessage: (v: object) => void };
const vscode = acquireVsCodeApi();

const STORAGE_KEYS = {
  chatHistory: `chatMessages-${tabId}`,
};

const InnerApp: React.FC = () => {
  const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>(
    STORAGE_KEYS.chatHistory,
    []
  );
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { tree, buildMessageTree } = useMessageTree(chatHistory);
  const scrollToBottom = useScrollToBottom(messagesContainerRef);

  const toggleCollapse = useCallback(
    (id: string) => {
      setChatHistory((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isCollapsed: !(m.isCollapsed || false) } : m
        )
      );
    },
    [setChatHistory]
  );

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
    vscode.postMessage({
      command: "updateSettings",
      settings: settingsPartial,
    });
  }, 500);

  useEffect(() => {
    sendSettingsUpdate({});
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      console.log("message1", message.command, message);
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
        case "setWorkspaceSettings":
          if (message.data?.openFiles) {
            setOpenFiles(message.data?.openFiles);
          }
          break;
        case "settingsUpdated":
          setCurrentSystemPrompt(message.settings.systemPrompt || "");
          setCurrentUserPrompt(message.settings.userPrompt || "");
          if (systemPromptRef.current)
            systemPromptRef.current.value = message.settings.systemPrompt || "";
          if (userInputRef.current)
            userInputRef.current.value = message.settings.userPrompt || "";
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
  }, [setChatHistory, sendSettingsUpdate]);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, [setChatHistory]);

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
      vscode.postMessage({
        command: "setWorkspaceSettings",
        data: { openFiles: newOpenFiles },
      });
    },
    [openFiles]
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

  const chatContextValue = {
    chatHistory,
    setChatHistory,
    tree,
    toggleCollapse,
    renderMessageRecursive,
    messagesContainerRef,
    scrollToBottom,
    clearChatHistory,
  };

  const settingsContextValue = {
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
    removeTool,
    userInputRef,
    systemPromptRef,
    runCommandInputRef,
    shellSelectorRef,
    vscode,
    tabId,
    toggleToolPopup,
    toggleProviderSettingsPopup,
    togglePrivacySettingsPopup,
  };

  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorBoundary>
          <ChatProvider value={chatContextValue}>
            <SettingsProvider value={settingsContextValue}>
              <MessageList />
              <InputArea />
            </SettingsProvider>
          </ChatProvider>
        </ErrorBoundary>
      </Suspense>
    </main>
  );
};

export const App: React.FC = () => <InnerApp />;
