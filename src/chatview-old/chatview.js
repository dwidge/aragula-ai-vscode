/* eslint-disable curly */
const vscode = acquireVsCodeApi();
const tabId = "${tabId}";

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} summary - A short summary for the header.
 * @property {string} [detail] - The full content of the message (optional).
 * @property {string} [sender] - Sender of the message (user, assistant, etc.)
 * @property {string} [messageType] - Type of message for styling (user, assistant, log, etc.)
 * @property {boolean} [isCollapsed] - If the message content is collapsed
 * @property {number} [stepIndex] - Optional step index if message belongs to a plan step
 * @property {string} [text] - Kept for backward compatibility, prefer 'detail'.
 */
/** @type {ChatMessage[]} */
let chatHistory = [];
/** @type {string[]} */
let openFiles = [];
/** @type {string[]} */
let systemPrompts = [];
/** @type {string[]} */
let userPrompts = [];
/** @type {string[]} */
let availableTools = [];
/** @type {{ name: string, path: string }[]} */
let availableShells = [];
/** @type {string[]} */
let enabledTools = [];
/** @type {Array<AiProviderSettings>} */
let providerSettingsList = [];
/** @type {AiProviderSettings | undefined} */
let currentProviderSetting = undefined;
/** @type {string[]} */
let availableVendors = [];
let systemPromptsPopupVisible = false;
let userPromptsPopupVisible = false;
let toolPopupVisible = false;
let providerSettingsPopupVisible = false;
let privacySettingsPopupVisible = false;
/** @type {string | null} */
let editingProviderName = null;
/** @type {string | null} */
let editingPrivacyPairSearch = null;
/** @type {string} */
let currentSystemPrompt = "";
/** @type {string} */
let currentUserPrompt = "";
/** @type {string} */
let currentRunCommand = "";
/** @type {string} */
let currentSelectedShell = "";
/** @type {boolean} */
let autoRemoveComments = true;
/** @type {boolean} */
let autoFormat = true;
/** @type {boolean} */
let autoFixErrors = true;
/** @type {boolean} */
let autoGenerateCommit = false;
/** @type {boolean} */
let useConventionalCommits = false;
/** @type {boolean} */
let includeCodebaseSummary = false;

/**
 * @typedef {Object} PrivacyPair
 * @property {string} search
 * @property {string} replace
 */
/** @type {PrivacyPair[]} */
let privacySettings = [];
/** @type {boolean} */
let isPrivacyMaskingEnabled = false;

/**
 * @typedef {Object} PlanStep
 * @property {string} description
 * @property {string} subPrompt
 * @property {boolean} [isCollapsed] - If the step content is collapsed
 */
/**
 * @typedef {Object} AIPlan
 * @property {string} overallGoal
 * @property {PlanStep[]} steps
 */
/**
 * @typedef {Object} PlanState
 * @property {'idle' | 'planning' | 'executing' | 'paused' | 'failed' | 'completed'} status
 * @property {number} currentStepIndex
 * @property {AIPlan | null} plan
 * @property {string | null} error
 * @property {string[]} filePaths
 * @property {AiProviderSettings | null} providerSetting
 * @property {boolean} autoRemoveComments
 * @property {boolean} autoFormat
 * @property {boolean} autoFixErrors
 * @property {boolean[]} [stepCollapsedStates] - Array to store collapse state for each step
 * @property {string} tabId - The tab ID this plan state belongs to
 */
/** @type {PlanState} */
let planState = {
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
  tabId: tabId,
};

const STORAGE_KEYS = {
  chatHistory: `chatMessages-${tabId}`,
  openFiles: `openFiles-${tabId}`,
};

const messagesContainer = document.getElementById("messages-container");
const userInputEl = document.getElementById("userInput");
const systemPromptEl = document.getElementById("systemPromptInput");
const runCommandInputEl = document.getElementById("runCommandInput");
const shellSelectorEl = document.getElementById("shellSelector");
const sendButton = document.getElementById("sendButton");
const buttonText = document.getElementById("buttonText");
const loader = document.getElementById("loader");
const planButton = document.getElementById("planButton");
const planButtonText = document.getElementById("planButtonText");
const planLoader = document.getElementById("planLoader");
const runCommandButton = document.getElementById("runCommandButton");
const runCommandButtonText = document.getElementById("runCommandButtonText");
const runCommandLoader = document.getElementById("runCommandLoader");
const selectedFilesContainer = document.getElementById(
  "selected-files-container"
);
const enabledToolsContainer = document.getElementById(
  "enabled-tools-container"
);
const systemPromptsPopupEl = document.getElementById("system-prompts-popup");
const userPromptsPopupEl = document.getElementById("user-prompts-popup");
const systemPromptsPopupListEl = document.getElementById(
  "system-prompts-popup-list"
);
const userPromptsPopupListEl = document.getElementById(
  "user-prompts-popup-list"
);
const systemPromptLoadButton = document.querySelector(
  "#systemPromptInput + .prompt-buttons > button:nth-child(1)"
);
const userPromptLoadButton = document.querySelector(
  "#userInput + .prompt-buttons > button:nth-child(1)"
);
const toolPopupEl = document.getElementById("tool-popup");
const toolPopupListEl = document.getElementById("tool-popup-list");
const addToolButton = document.getElementById("addToolButton");
const selectedProviderContainer = document.getElementById(
  "selected-provider-container"
);
const providerSettingsPopupEl = document.getElementById("provider-popup");
const providerSettingsPopupListEl = document.getElementById(
  "provider-popup-list"
);
const providerSettingsButton = document.getElementById(
  "providerSettingsButton"
);
const providerFormEl = document.getElementById("provider-form");
const providerNameInput = document.getElementById("provider-name");
const providerVendorInput = document.getElementById("provider-vendor");
const providerApiKeyInput = document.getElementById("provider-apiKey");
const providerBaseURLInput = document.getElementById("provider-baseURL");
const providerModelInput = document.getElementById("provider-model");
const providerMaxTokensInput = document.getElementById("provider-maxTokens");
const providerTemperatureInput = document.getElementById(
  "provider-temperature"
);
const providerNameError = document.getElementById("provider-name-error");
const providerVendorError = document.getElementById("provider-vendor-error");
const providerApiKeyError = document.getElementById("provider-apiKey-error");
const providerModelError = document.getElementById("provider-model-error");
const providerTemperatureError = document.getElementById(
  "provider-temperature-error"
);
const providerProviderInput = document.getElementById("provider-provider");
const providerProviderError = document.getElementById(
  "provider-provider-error"
);
const removeCommentsButton = document.getElementById("removeCommentsButton");
const formatButton = document.getElementById("formatButton");
const fixErrorsButton = document.getElementById("fixErrorsButton");
const autoRemoveCommentsCheckbox = document.getElementById(
  "autoRemoveCommentsCheckbox"
);
const autoFormatCheckbox = document.getElementById("autoFormatCheckbox");
const autoFixErrorsCheckbox = document.getElementById("autoFixErrorsCheckbox");
const autoGenerateCommitCheckbox = document.getElementById(
  "autoGenerateCommitCheckbox"
);
const useConventionalCommitsCheckbox = document.getElementById(
  "useConventionalCommitsCheckbox"
);
const commitFilesButton = document.getElementById("commitFilesButton");
const testTaskButton = document.getElementById("testTaskButton");
const testMultiTaskButton = document.getElementById("testMultiTaskButton");
const testSerialTaskButton = document.getElementById("testSerialTaskButton");
const testFormTaskButton = document.getElementById("testFormTaskButton");
const testSetCommitMessageButton = document.getElementById(
  "testSetCommitMessageButton"
);
const showCodebaseSummaryButton = document.getElementById(
  "showCodebaseSummaryButton"
);
const privacySettingsPopupEl = document.getElementById("privacy-popup");
const privacySettingsPopupListEl =
  document.getElementById("privacy-popup-list");
const privacySettingsButton = document.getElementById("privacySettingsButton");
const privacyFormEl = document.getElementById("privacy-form");
const privacySearchInput = document.getElementById("privacy-search");
const privacyReplaceInput = document.getElementById("privacy-replace");
const privacySearchError = document.getElementById("privacy-search-error");
const privacyReplaceError = document.getElementById("privacy-replace-error");
const isPrivacyMaskingEnabledCheckbox = document.getElementById(
  "isPrivacyMaskingEnabledCheckbox"
);
const includeCodebaseSummaryCheckbox = document.getElementById(
  "includeCodebaseSummaryCheckbox"
);

/**
 * @typedef {Object} AiProviderSettings
 * @property {string} name
 * @property {string} vendor
 * @property {string} apiKey
 * @property {string} [baseURL]
 * @property {string} model
 * @property {string} [provider]
 * @property {number} [max_tokens]
 * @property {number} [temperature]
 */

/**
 * Loads state from localStorage: chat history, open files.
 * Note: Plan state, prompts, auto settings, enabled tools, current provider,
 * available vendors/tools are loaded from workspaceState/globalState via
 * the single `settingsUpdated` message upon activation.
 */
function loadState() {
  chatHistory = loadFromLocalStorage(STORAGE_KEYS.chatHistory, []);
  openFiles = loadFromLocalStorage(STORAGE_KEYS.openFiles, []);
}

/**
 * Helper function to load and parse JSON data from localStorage.
 * @param {string} key - localStorage key
 * @param {any} defaultValue - Default value if key not found or parsing fails.
 * @returns {any} - Parsed data or defaultValue.
 */
function loadFromLocalStorage(key, defaultValue) {
  const data = localStorage.getItem(key);
  try {
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error(`Error parsing localStorage key ${key}: `, e);
    return defaultValue;
  }
}

/**
 * Saves state to localStorage: chat history, open files.
 * Checkbox states, plan state, enabled tools, current provider, and prompt inputs
 * are saved to workspaceState/globalState via extension messages.
 */
function saveState() {
  try {
    saveToLocalStorage(STORAGE_KEYS.chatHistory, chatHistory);
    saveToLocalStorage(STORAGE_KEYS.openFiles, openFiles);
  } catch (e) {
    console.error("saveStateE1: Error saving state to localStorage: ", e);
  }
}

/**
 * Helper function to save data to localStorage as JSON.
 * @param {string} key - localStorage key
 * @param {any} data - Data to stringify and save.
 */
function saveToLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Renders the entire chat history to the DOM.
 */
function renderChatHistory() {
  messagesContainer.innerHTML = "";
  chatHistory.forEach((msg) => {
    renderMessage({
      id: msg.id,
      type: msg.messageType,
      summary: msg.summary,
      detail: msg.detail,
      isCollapsed: msg.isCollapsed,
    });
  });
  scrollToBottom();
}

/**
 * Creates and appends a message element to the DOM.
 * @param {object} params - Parameters for the message.
 * @param {string} params.id - Unique ID for the message element.
 * @param {string} [params.type='log'] - Type of message for styling and badge.
 * @param {string} [params.summary] - Short summary for the message header.
 * @param {string} [params.detail] - Full detail for the collapsible content.
 * @param {number} [params.progress] - Progress value (0 to 1) for a task.
 * @param {boolean} [params.isCollapsed=false] - Initial collapsed state.
 * @param {object} [params.formSchema=null] - JSON schema for a form to render.
 * @param {HTMLElement} [targetContainer=messagesContainer] - The container to append the message to.
 */
function renderMessage(
  {
    id,
    type = "log",
    summary,
    detail,
    progress,
    isCollapsed = false,
    formSchema = null,
  },
  targetContainer = messagesContainer
) {
  const el = document.createElement("pre");
  el.classList.add("message");
  el.classList.add(`${type}-message`);
  if (["prompt", "tool"].includes(type)) {
    el.classList.add("tool-message");
  }
  if (id) el.id = `message-${id}`;

  if (progress !== undefined) {
    const progressBarContainer = document.createElement("div");
    progressBarContainer.classList.add("progress-bar-container");
    const progressBarFill = document.createElement("div");
    progressBarFill.title =
      progress !== undefined ? `${Math.round(progress * 100)}%` : "";
    progressBarFill.classList.add("progress-bar-fill");
    const width = Math.max(0, Math.min(1, progress)) * 100;
    progressBarFill.style.width = `${width}%`;
    if (progress < 0) {
      progressBarContainer.classList.add("failed");
    } else if (progress === 1) {
      progressBarContainer.classList.add("completed");
    } else if (progress > 0 && progress < 1) {
      progressBarContainer.classList.add("busy");
    }
    progressBarContainer.appendChild(progressBarFill);
    el.appendChild(progressBarContainer);
  }

  const messageContentWrapper = document.createElement("div");
  messageContentWrapper.classList.add("message-content-wrapper");

  const headerDiv = document.createElement("div");
  headerDiv.classList.add("message-header");

  const previewSpan = document.createElement("span");
  previewSpan.classList.add("message-preview");
  previewSpan.textContent = summary !== undefined ? summary : "";
  headerDiv.appendChild(previewSpan);

  const badge = document.createElement("span");
  badge.classList.add("message-type-badge");
  badge.textContent = type;
  headerDiv.appendChild(badge);

  const cancelButton = document.createElement("button");
  cancelButton.classList.add("cancel-button");
  cancelButton.textContent = "✕";
  cancelButton.title = "Cancel Task";
  cancelButton.style.display = "none";
  cancelButton.onclick = (event) => {
    event.stopPropagation();
    handleCancelTask(id);
  };
  headerDiv.appendChild(cancelButton);

  const collapseButton = document.createElement("button");
  collapseButton.classList.add("collapse-button");
  collapseButton.textContent = isCollapsed ? "▼" : "▲";
  headerDiv.appendChild(collapseButton);

  messageContentWrapper.appendChild(headerDiv);

  const contentDiv = document.createElement("div");
  contentDiv.classList.add("collapsible-content");
  contentDiv.classList.toggle("collapsed", isCollapsed);

  const messageBodyContentDiv = document.createElement("div");
  messageBodyContentDiv.classList.add("message-body-content");

  const messageDetailTextDiv = document.createElement("div");
  messageDetailTextDiv.classList.add("message-detail-text");
  messageDetailTextDiv.innerHTML = (detail || "").replace(/\n/g, "<br>");
  messageBodyContentDiv.appendChild(messageDetailTextDiv);

  if (formSchema) {
    messageDetailTextDiv.style.display = "none";
    const formContainer = document.createElement("div");
    formContainer.classList.add("form-container");
    buildFormElements(formContainer, formSchema, id);
    messageBodyContentDiv.appendChild(formContainer);
  }

  const childMessagesContainer = document.createElement("div");
  childMessagesContainer.classList.add("child-messages-container");
  childMessagesContainer.style.display = isCollapsed ? "none" : "";
  messageBodyContentDiv.appendChild(childMessagesContainer);

  contentDiv.appendChild(messageBodyContentDiv);
  messageContentWrapper.appendChild(contentDiv);

  el.appendChild(messageContentWrapper);

  updateMessageCollapsibility(el);
  updateCancelButtonVisibility(el, type, progress);
  targetContainer.appendChild(el);
}

/**
 * Updates an existing message element in the DOM.
 * @param {string} id - ID of the message element to update.
 * @param {object} params - Parameters for the update.
 * @param {string} [params.type] - New type of message.
 * @param {string} [params.summary] - New summary.
 * @param {string} [params.detail] - New detail.
 * @param {number} [params.progress] - New progress value.
 * @param {object} [params.formSchema] - New JSON schema for a form to render (null to remove form).
 * @param {HTMLElement} [container=messagesContainer] - The container where the message is rendered.
 */
function updateMessageElement(
  id,
  { type, summary, detail, progress, formSchema = undefined },
  container = messagesContainer
) {
  const el = container.querySelector(`#message-${id}`);
  if (!el) return;

  const contentDiv = el.querySelector(".collapsible-content");
  const previewSpan = el.querySelector(".message-preview");
  const badge = el.querySelector(".message-type-badge");
  const messageDetailTextDiv = el.querySelector(".message-detail-text");
  let progressBarContainer = el.querySelector(".progress-bar-container");
  let progressBarFill = el.querySelector(".progress-bar-fill");
  const childMessagesContainer = el.querySelector(".child-messages-container");
  let formContainer = el.querySelector(".form-container");

  const currentType = el.classList.contains("user-message")
    ? "user"
    : el.classList.contains("assistant-message")
    ? "assistant"
    : el.classList.contains("system-message")
    ? "system"
    : el.classList.contains("prompt-message")
    ? "prompt"
    : el.classList.contains("tool-message")
    ? "tool"
    : el.classList.contains("log-message")
    ? "log"
    : el.classList.contains("error-message")
    ? "error"
    : el.classList.contains("warning-message")
    ? "warning"
    : el.classList.contains("info-message")
    ? "info"
    : el.classList.contains("loading-message")
    ? "loading"
    : el.classList.contains("task-message")
    ? "task"
    : el.classList.contains("form-prompt-message")
    ? "form-prompt"
    : "log";

  if (summary !== undefined && previewSpan) {
    previewSpan.innerHTML = summary.replace(/\n/g, "<br>");
  }

  if (detail !== undefined && messageDetailTextDiv) {
    messageDetailTextDiv.innerHTML = detail.replace(/\n/g, "<br>");
  }
  if (type !== undefined && badge) {
    badge.textContent = type;
    el.classList.remove(
      "user-message",
      "assistant-message",
      "system-message",
      "prompt-message",
      "tool-message",
      "log-message",
      "error-message",
      "warning-message",
      "info-message",
      "loading-message",
      "task-message",
      "form-prompt-message"
    );
    el.classList.add(`${type}-message`);
    if (["prompt", "tool"].includes(type)) {
      el.classList.add("tool-message");
    }
  }

  if (formSchema !== undefined) {
    if (formSchema === null) {
      if (formContainer) {
        formContainer.remove();
        formContainer = null;
      }
      if (messageDetailTextDiv) {
        messageDetailTextDiv.style.display = "";
      }
      const headerDiv = el.querySelector(".message-header");
      const collapseButton = el.querySelector(".collapse-button");
      if (headerDiv) headerDiv.classList.remove("non-collapsible");
      if (collapseButton) collapseButton.style.display = "";
    } else if (formSchema !== null) {
      if (!formContainer) {
        formContainer = document.createElement("div");
        formContainer.classList.add("form-container");
        const messageBodyContentDiv = el.querySelector(".message-body-content");
        if (messageBodyContentDiv) {
          messageBodyContentDiv.appendChild(formContainer);
        }
      }
      if (messageDetailTextDiv) {
        messageDetailTextDiv.style.display = "none";
      }
      formContainer.innerHTML = "";
      buildFormElements(formContainer, formSchema, id);

      const headerDiv = el.querySelector(".message-header");
      const collapseButton = el.querySelector(".collapse-button");
      const contentDiv = el.querySelector(".collapsible-content");
      const childMessagesContainer = el.querySelector(
        ".child-messages-container"
      );

      if (headerDiv) headerDiv.classList.add("non-collapsible");
      if (collapseButton) collapseButton.style.display = "none";
      if (contentDiv) contentDiv.classList.remove("collapsed");
      if (childMessagesContainer) childMessagesContainer.style.display = "";
    }
  } else {
    if (messageDetailTextDiv) {
      messageDetailTextDiv.style.display = formContainer ? "none" : "";
    }
  }

  if (progress !== undefined) {
    if (!progressBarContainer) {
      progressBarContainer = document.createElement("div");
      progressBarContainer.classList.add("progress-bar-container");
      progressBarFill = document.createElement("div");
      progressBarFill.classList.add("progress-bar-fill");
      progressBarContainer.appendChild(progressBarFill);
      const messageContentWrapper = el.querySelector(
        ".message-content-wrapper"
      );
      if (messageContentWrapper) {
        messageContentWrapper.before(progressBarContainer);
      } else {
        el.prepend(progressBarContainer);
      }
    } else {
      progressBarContainer.style.display = "";
    }

    progressBarFill.title =
      progress !== undefined ? `${Math.round(progress * 100)}%` : "";
    const width = Math.max(0, Math.min(1, progress)) * 100;
    progressBarFill.style.width = `${width}%`;

    progressBarContainer.classList.remove("failed", "completed", "busy");
    if (progress < 0) {
      progressBarContainer.classList.add("failed");
    } else if (progress === 1) {
      progressBarContainer.classList.add("completed");
    } else if (progress > 0 && progress < 1) {
      progressBarContainer.classList.add("busy");
    }
  } else if (progressBarContainer) {
    const isCompletedOrFailed =
      progressBarContainer.classList.contains("completed") ||
      progressBarContainer.classList.contains("failed");
    if (!isCompletedOrFailed) {
      progressBarContainer.style.display = "none";
    }
  }

  updateMessageCollapsibility(el);
  updateCancelButtonVisibility(el, type || currentType, progress);
}

/**
 * Dynamically builds form elements based on a JSON schema.
 * @param {HTMLElement} container - The container to append form elements to.
 * @param {object} schema - The JSON schema for the form.
 * @param {string} formId - The ID of the form request.
 */
function buildFormElements(container, schema, formId) {
  if (!schema || !schema.properties) {
    console.error("Invalid form schema:", schema);
    return;
  }

  const form = document.createElement("form");
  form.onsubmit = (e) => e.preventDefault();

  const inputElements = {};
  const errorElements = {};

  for (const key in schema.properties) {
    const prop = schema.properties[key];
    const fieldDiv = document.createElement("div");
    fieldDiv.classList.add("form-field");

    const label = document.createElement("label");
    label.textContent = prop.title || key;
    label.setAttribute("for", `form-${formId}-${key}`);
    fieldDiv.appendChild(label);

    let input;
    switch (prop.type) {
      case "string":
        input = document.createElement("input");
        input.type = "text";
        if (prop.format === "email") {
          input.type = "email";
        }
        break;
      case "number":
      case "integer":
        input = document.createElement("input");
        input.type = "number";
        if (prop.minimum !== undefined) input.min = prop.minimum;
        if (prop.maximum !== undefined) input.max = prop.maximum;
        if (prop.step !== undefined) input.step = prop.step;
        break;
      default:
        input = document.createElement("input");
        input.type = "text";
    }
    input.id = `form-${formId}-${key}`;
    input.name = key;
    input.classList.add("form-input");
    input.placeholder = prop.title || key;
    fieldDiv.appendChild(input);

    const errorSpan = document.createElement("span");
    errorSpan.classList.add("form-error-message");
    errorSpan.style.display = "none";
    fieldDiv.appendChild(errorSpan);

    inputElements[key] = input;
    errorElements[key] = errorSpan;

    form.appendChild(fieldDiv);
  }

  const buttonRow = document.createElement("div");
  buttonRow.classList.add("form-buttons-row");

  const submitButton = document.createElement("button");
  submitButton.classList.add("submit-button");
  submitButton.textContent = "Submit";
  submitButton.onclick = () => {
    let isValid = true;
    const submittedData = {};
    for (const key in schema.properties) {
      const prop = schema.properties[key];
      const input = inputElements[key];
      const errorSpan = errorElements[key];

      errorSpan.style.display = "none";

      let value = input.value.trim();
      if (prop.type === "number" || prop.type === "integer") {
        value = parseFloat(value);
        if (isNaN(value) && schema.required && schema.required.includes(key)) {
          errorSpan.textContent = `${
            prop.title || key
          } is required and must be a number.`;
          errorSpan.style.display = "block";
          isValid = false;
        } else if (!isNaN(value)) {
          submittedData[key] = value;
        }
      } else {
        if (schema.required && schema.required.includes(key) && !value) {
          errorSpan.textContent = `${prop.title || key} is required.`;
          errorSpan.style.display = "block";
          isValid = false;
        }
        submittedData[key] = value;
      }
    }

    if (isValid) {
      Object.values(inputElements).forEach((input) => {
        input.readOnly = true;
        input.disabled = true;
      });
      submitButton.textContent = "Submitted";
      submitButton.disabled = true;
      cancelButton.style.display = "none";
      cancelButton.disabled = true;

      vscode.postMessage({
        command: "formResponse",
        formResponse: {
          id: formId,
          isCancelled: false,
          formData: submittedData,
        },
      });
    }
  };
  buttonRow.appendChild(submitButton);

  const cancelButton = document.createElement("button");
  cancelButton.classList.add("cancel-button");
  cancelButton.textContent = "Cancel";
  cancelButton.onclick = () => {
    Object.values(inputElements).forEach((input) => {
      input.readOnly = true;
      input.disabled = true;
    });
    cancelButton.textContent = "Cancelled";
    cancelButton.disabled = true;
    submitButton.style.display = "none";
    submitButton.disabled = true;

    vscode.postMessage({
      command: "formResponse",
      formResponse: {
        id: formId,
        isCancelled: true,
      },
    });
  };
  buttonRow.appendChild(cancelButton);

  form.appendChild(buttonRow);
  container.appendChild(form);
}

/**
 * Updates the collapsibility state of a message based on its content.
 * Hides/shows the collapse button and sets the non-collapsible class on the header.
 * @param {HTMLElement} messageEl - The message element (<pre>) to update.
 */
function updateMessageCollapsibility(messageEl) {
  if (!messageEl) return;

  const headerDiv = messageEl.querySelector(".message-header");
  const contentDiv = messageEl.querySelector(".collapsible-content");
  const collapseButton = messageEl.querySelector(".collapse-button");
  const detailTextDiv = messageEl.querySelector(".message-detail-text");
  const childMessagesContainer = messageEl.querySelector(
    ".child-messages-container"
  );
  const formContainer = messageEl.querySelector(".form-container");

  const hasDetailText =
    detailTextDiv && detailTextDiv.textContent.trim() !== "";
  const hasChildMessages =
    childMessagesContainer && childMessagesContainer.children.length > 0;
  const hasForm = formContainer !== null;

  const isCollapsible = hasDetailText || hasChildMessages;

  if (hasForm) {
    headerDiv.classList.add("non-collapsible");
    if (collapseButton) collapseButton.style.display = "none";
    if (contentDiv) contentDiv.classList.remove("collapsed");
    if (childMessagesContainer) childMessagesContainer.style.display = "";
  } else if (isCollapsible) {
    headerDiv.classList.remove("non-collapsible");
    if (collapseButton) collapseButton.style.display = "";
  } else {
    headerDiv.classList.add("non-collapsible");
    if (collapseButton) collapseButton.style.display = "none";
    if (contentDiv) contentDiv.classList.add("collapsed");
    if (childMessagesContainer) childMessagesContainer.style.display = "none";
  }
}

/**
 * Updates the visibility of the cancel button based on message type and progress.
 * @param {HTMLElement} messageEl - The message element (<pre>) to update.
 * @param {string} type - The message type.
 * @param {number} [progress] - The progress value.
 */
function updateCancelButtonVisibility(messageEl, type, progress) {
  if (!messageEl) return;
  const cancelButton = messageEl.querySelector(".cancel-button");
  if (cancelButton) {
    const isBusy = progress !== undefined && progress >= 0 && progress < 1;
    cancelButton.style.display = isBusy ? "" : "none";
  }
}

/**
 * Updates an existing chat message in the chatHistory array.
 * This is primarily for main chat messages that need persistence.
 * @param {string} id - ID of the message to update.
 * @param {string} [newDetail] - New message detail text (optional).
 * @param {string} [newSummary] - New message summary (optional).
 * @param {string} newSender - New sender.
 * @param {string} [newMessageType] - New message type (optional).
 */
function updateMainChatMessageHistory(
  id,
  newDetail,
  newSummary,
  newSender,
  newMessageType
) {
  const msg = chatHistory.find((m) => m.id === id);
  if (msg) {
    if (newDetail !== undefined) {
      msg.detail = newDetail;
    }
    if (newSummary !== undefined) {
      msg.summary = newSummary;
    }
    if (newSender !== undefined) {
      msg.sender = newSender;
    }
    if (newMessageType !== undefined) {
      msg.messageType = newMessageType;
    }
    saveState();
  }
}

/**
 * Toggles the collapsed state of a message and updates the DOM.
 * @param {string} messageId - ID of the message to toggle.
 * @param {HTMLElement} [container=messagesContainer] - The container where the message is rendered.
 */
function toggleMessageCollapse(messageId, container = messagesContainer) {
  const el = container.querySelector(`#message-${messageId}`);
  if (!el) return;

  const contentDiv = el.querySelector(".collapsible-content");
  const collapseButton = el.querySelector(".collapse-button");
  const progressBarContainer = el.querySelector(".progress-bar-container");
  const childMessagesContainer = el.querySelector(".child-messages-container");
  const headerDiv = el.querySelector(".message-header");

  if (headerDiv.classList.contains("non-collapsible")) {
    return;
  }

  if (contentDiv && collapseButton) {
    const isCollapsed = contentDiv.classList.toggle("collapsed");
    collapseButton.textContent = isCollapsed ? "▼" : "▲";

    if (progressBarContainer) {
      const isCompletedOrFailed =
        progressBarContainer.classList.contains("completed") ||
        progressBarContainer.classList.contains("failed");
      progressBarContainer.style.display =
        isCollapsed && !isCompletedOrFailed ? "none" : "";
    }

    if (childMessagesContainer) {
      childMessagesContainer.style.display = isCollapsed ? "none" : "";
    }

    if (container === messagesContainer) {
      const msg = chatHistory.find((m) => m.id === messageId);
      if (msg) {
        msg.isCollapsed = isCollapsed;
        saveState();
      }
    }
  }
}

/**
 * Clears chat history from memory and localStorage, then re-renders.
 */
function clearChatHistory() {
  chatHistory = [];
  localStorage.removeItem(STORAGE_KEYS.chatHistory);
  messagesContainer.innerHTML = "";
}

/**
 * Scrolls the messages container to the bottom.
 */
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Debounces a function call.
 * @param {Function} func - Function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {Function} - Debounced function.
 */
function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

/**
 * Sends a partial settings update to the extension.
 * @param {object} settingsPartial - An object containing the settings fields to update.
 */
const sendSettingsUpdate = debounce((settingsPartial) => {
  vscode.postMessage({
    command: "updateSettings",
    settings: settingsPartial,
  });
}, 500);

const updateSystemPrompt = (value) => {
  currentSystemPrompt = value;
  sendSettingsUpdate({ systemPrompt: value });
};

const updateUserPrompt = (value) => {
  currentUserPrompt = value;
  sendSettingsUpdate({ userPrompt: value });
};

const updateRunCommand = (value) => {
  currentRunCommand = value;
  sendSettingsUpdate({ runCommand: value });
};

/**
 * Resets the send button state to enable and hide loader.
 */
function resetSendButton() {
  sendButton.disabled = false;
  loader.style.display = "none";
  buttonText.textContent = "Send";
}

/**
 * Resets the plan button state to enable and hide loader.
 */
function resetPlanButton() {
  planButton.disabled = false;
  planLoader.style.display = "none";
  planButtonText.textContent = "Plan & Execute";
}

/**
 * Resets the run command button state to enable and hide loader.
 */
function resetRunCommandButton() {
  runCommandButton.disabled = false;
  runCommandLoader.style.display = "none";
  runCommandButtonText.textContent = "Run";
}

/**
 * Renders the selected files in the UI.
 */
function renderSelectedFiles() {
  selectedFilesContainer.innerHTML = "";
  openFiles.forEach((filePath) => {
    const fileButton = document.createElement("div");
    fileButton.classList.add("file-button");
    fileButton.textContent = filePath;

    const removeButton = document.createElement("button");
    removeButton.classList.add("remove-file-button");
    removeButton.textContent = "✕";
    removeButton.onclick = () => removeFile(filePath);

    fileButton.appendChild(removeButton);
    selectedFilesContainer.appendChild(fileButton);
  });
}

/**
 * Renders the enabled tools in the UI.
 */
function renderEnabledTools() {
  enabledToolsContainer.innerHTML = "";
  enabledTools.forEach((toolName) => {
    const toolButton = document.createElement("div");
    toolButton.classList.add("tool-button");
    toolButton.textContent = toolName;

    const removeButton = document.createElement("button");
    removeButton.classList.add("remove-tool-button");
    removeButton.textContent = "✕";
    removeButton.onclick = () => disableTool(toolName);

    toolButton.appendChild(removeButton);
    enabledToolsContainer.appendChild(toolButton);
  });
}

/**
 * Renders the selected provider in the UI.
 */
function renderSelectedProvider() {
  selectedProviderContainer.innerHTML = "";
  if (currentProviderSetting) {
    const providerButton = document.createElement("div");
    providerButton.classList.add("provider-button");
    providerButton.textContent = currentProviderSetting.name;

    selectedProviderContainer.appendChild(providerButton);
  }
}

/**
 * Removes a file from the open files list and updates UI and extension.
 * @param {string} filePath - Path of the file to remove.
 */
function removeFile(filePath) {
  openFiles = openFiles.filter((file) => file !== filePath);
  saveState();
  renderSelectedFiles();

  vscode.postMessage({ command: "removeFile", filePath: filePath });
}

/**
 * Adds files to the open files list, updates UI and extension.
 * Prevents duplicate file paths.
 * This function is called by the webview's drag/drop handler and addFiles handler.
 * @param {string[]} files - Array of file paths to add.
 */
function addFiles(files) {
  const newFiles = files.filter((filePath) => !openFiles.includes(filePath));
  if (newFiles.length > 0) {
    openFiles.push(...newFiles);
    saveState();
    renderSelectedFiles();

    vscode.postMessage({ command: "addFiles", filePaths: newFiles });
  }
}

/**
 * Opens the file dialog to add files.
 */
function addFilesDialog() {
  vscode.postMessage({ command: "openFilesDialog" });
}

/**
 * Allows drag over event for drag and drop file functionality.
 * @param {DragEvent} event
 */
function allowDrop(event) {
  event.preventDefault();
}

/**
 * Handles the drop event for drag and drop file functionality.
 * @param {DragEvent} event
 */
async function dropHandler(event) {
  event.preventDefault();
  let filePaths = [];
  if (event.dataTransfer.items) {
    const items = Array.from(event.dataTransfer.items);
    filePaths = await Promise.all(
      items.map((item) => {
        if (item.kind === "file") {
          const file = item.getAsFile();
          return file ? file.path : null;
        }
        return null;
      })
    ).then((paths) => paths.filter((path) => path !== null));
  } else {
    filePaths = Array.from(event.dataTransfer.files).map((file) => file.path);
  }

  if (filePaths.length > 0) {
    addFiles(filePaths);
  }
}

/**
 * Handles sending a message to the extension.
 */
function handleSendMessage() {
  if (sendButton.disabled) return;
  const user = userInputEl.value.trim();
  const system = systemPromptEl.value.trim();
  if (!user) {
    alert("Please enter a message before sending.");
    return;
  }
  if (!currentProviderSetting) {
    alert("Please select an AI Provider in 'Providers' popup.");
    return;
  }

  sendButton.disabled = true;
  loader.style.display = "inline-block";
  buttonText.textContent = "";

  const autoRemoveComments = autoRemoveCommentsCheckbox.checked;
  const autoFormat = autoFormatCheckbox.checked;
  const autoFixErrors = autoFixErrorsCheckbox.checked;
  const autoGenerateCommit = autoGenerateCommitCheckbox.checked;
  const useConventionalCommits = useConventionalCommitsCheckbox.checked;
  const includeCodebaseSummary = includeCodebaseSummaryCheckbox.checked;

  const messageId = Date.now().toString();

  vscode.postMessage({
    command: "sendMessage",
    user: user,
    system: system,
    fileNames: openFiles,
    toolNames: enabledTools,
    providerSetting: currentProviderSetting,
    messageId,
    autoRemoveComments: autoRemoveComments,
    autoFormat: autoFormat,
    autoFixErrors: autoFixErrors,
    autoGenerateCommit: autoGenerateCommit,
    useConventionalCommits: useConventionalCommits,
    privacySettings: privacySettings,
    isPrivacyMaskingEnabled: isPrivacyMaskingEnabled,
    includeCodebaseSummary,
  });
}

/**
 * Handles initiating the plan and execute mode.
 */
function handlePlanAndExecute() {
  if (planButton.disabled) return;
  const user = userInputEl.value.trim();
  const system = systemPromptEl.value.trim();
  if (!user) {
    alert("Please enter a user prompt describing the task for the plan.");
    return;
  }
  if (!currentProviderSetting) {
    alert("Please select an AI Provider in 'Providers' popup before planning.");
    return;
  }

  planButton.disabled = true;
  planLoader.style.display = "inline-block";
  planButtonText.textContent = "";

  const autoRemoveComments = autoRemoveCommentsCheckbox.checked;
  const autoFormat = autoFormatCheckbox.checked;
  const autoFixErrors = autoFixErrorsCheckbox.checked;

  vscode.postMessage({
    command: "planAndExecute",
    user: user,
    system: system,
    fileNames: openFiles,
    providerSetting: currentProviderSetting,
    autoRemoveComments: autoRemoveComments,
    autoFormat: autoFormat,
    autoFixErrors: autoFixErrors,
    privacySettings: privacySettings,
    isPrivacyMaskingEnabled: isPrivacyMaskingEnabled,
  });
}

/**
 * Handles running a command in the workspace.
 */
function handleRunCommand() {
  if (runCommandButton.disabled) return;
  const command = runCommandInputEl.value.trim();
  if (!command) {
    alert("Please enter a command to run.");
    return;
  }

  runCommandButton.disabled = true;
  runCommandLoader.style.display = "inline-block";
  runCommandButtonText.textContent = "";
  runCommandLoader.title = "Running...";

  const shell = shellSelectorEl.value;

  vscode.postMessage({
    command: "runCommand",
    runCommand: command,
    shell: shell,
  });
}

/**
 * Handles cancelling a specific task.
 * @param {string} taskId - The ID of the task to cancel.
 */
function handleCancelTask(taskId) {
  vscode.postMessage({ command: "cancelTask", id: taskId });
}

/**
 * Handles removing comments from selected files.
 */
function handleRemoveComments() {
  if (openFiles.length === 0) {
    alert("Please add files first.");
    return;
  }
  vscode.postMessage({
    command: "removeCommentsInFiles",
    filePaths: openFiles,
  });
}

/**
 * Handles formatting selected files.
 */
function handleFormat() {
  if (openFiles.length === 0) {
    alert("Please add files first.");
    return;
  }
  vscode.postMessage({
    command: "formatFilesInFiles",
    filePaths: openFiles,
  });
}

/**
 * Handles fixing errors in selected files.
 */
function handleFixErrors() {
  if (openFiles.length === 0) {
    alert("Please add files first.");
    return;
  }
  if (!currentProviderSetting) {
    alert("Please select an AI Provider in 'Providers' popup.");
    return;
  }
  vscode.postMessage({
    command: "checkErrorsInFiles",
    filePaths: openFiles,
    providerSetting: currentProviderSetting,
  });
}

/**
 * Handles committing selected files.
 */
function handleCommitFiles() {
  if (openFiles.length === 0) {
    alert("No files selected to commit.");
    return;
  }
  vscode.postMessage({ command: "commitFiles", fileNames: openFiles });
}

/**
 * Handles triggering the test task logger simulation.
 */
function handleTestTask() {
  vscode.postMessage({ command: "runTestTask" });
}

/**
 * Handles triggering the test multi-task logger simulation.
 */
function handleTestMultiTask() {
  vscode.postMessage({ command: "runTestMultiTask" });
}

/**
 * Handles triggering the test serial-task logger simulation.
 */
function handleTestSerialTask() {
  vscode.postMessage({ command: "runTestSerialTask" });
}

/**
 * Handles triggering the test form task simulation.
 */
function handleTestFormTask() {
  vscode.postMessage({ command: "runTestFormTask" });
}

function handleTestSetCommitMessage() {
  vscode.postMessage({
    command: "runTestSetCommitMessage",
  });
}

function handleShowCodebaseSummary() {
  vscode.postMessage({
    command: "runShowCodebaseSummary",
  });
}

function renderSystemPromptsList() {
  systemPromptsPopupListEl.innerHTML = "";
  systemPrompts.forEach((prompt) => {
    const listItem = document.createElement("li");
    listItem.classList.add("prompt-item");

    const textSpan = document.createElement("span");
    textSpan.classList.add("prompt-text");
    textSpan.textContent = prompt;
    listItem.onclick = () => insertSystemPrompt(prompt);

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("prompt-delete-button");
    deleteButton.textContent = "✕";
    deleteButton.onclick = (event) => {
      event.stopPropagation();
      deleteSystemPrompt(prompt);
    };

    listItem.appendChild(textSpan);
    listItem.appendChild(deleteButton);
    systemPromptsPopupListEl.appendChild(listItem);
  });
}

function renderUserPromptsList() {
  userPromptsPopupListEl.innerHTML = "";
  userPrompts.forEach((prompt) => {
    const listItem = document.createElement("li");
    listItem.classList.add("prompt-item");

    const textSpan = document.createElement("span");
    textSpan.classList.add("prompt-text");
    textSpan.textContent = prompt;
    listItem.onclick = () => insertUserPrompt(prompt);

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("prompt-delete-button");
    deleteButton.textContent = "✕";
    deleteButton.onclick = (event) => {
      event.stopPropagation();
      deleteUserPrompt(prompt);
    };

    listItem.appendChild(textSpan);
    listItem.appendChild(deleteButton);
    userPromptsPopupListEl.appendChild(listItem);
  });
}

function renderAvailableShells() {
  const selectedValue = shellSelectorEl.value;
  shellSelectorEl.innerHTML = "";
  availableShells.forEach((shell) => {
    const option = document.createElement("option");
    option.value = shell.path;
    option.textContent = shell.name;
    shellSelectorEl.appendChild(option);
  });
  if (availableShells.some((s) => s.path === selectedValue)) {
    shellSelectorEl.value = selectedValue;
  }
}

function renderToolPopupList() {
  toolPopupListEl.innerHTML = "";
  availableTools.forEach((toolName) => {
    if (!enabledTools.includes(toolName)) {
      const listItem = document.createElement("li");
      listItem.classList.add("tool-item");
      listItem.textContent = toolName;
      listItem.onclick = () => enableTool(toolName);
      toolPopupListEl.appendChild(listItem);
    }
  });
}

function renderProviderSettingsPopupList() {
  providerSettingsPopupListEl.innerHTML = "";
  providerSettingsList.forEach((providerSetting) => {
    const listItem = document.createElement("li");
    listItem.classList.add("provider-item");

    const textSpan = document.createElement("span");
    textSpan.classList.add("prompt-text");
    textSpan.textContent = providerSetting.name;
    listItem.onclick = () => selectProviderSetting(providerSetting.name);

    const editButton = document.createElement("button");
    editButton.classList.add("select-provider-button");
    editButton.textContent = "✏️";
    editButton.title = "Edit";
    editButton.onclick = (event) => {
      event.stopPropagation();
      loadProviderSettingToForm(providerSetting);
    };

    const duplicateButton = document.createElement("button");
    duplicateButton.classList.add("duplicate-provider-button");
    duplicateButton.textContent = "📄";
    duplicateButton.title = "Duplicate";
    duplicateButton.onclick = (event) => {
      event.stopPropagation();
      handleDuplicateProviderSetting(providerSetting.name);
    };

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("prompt-delete-button");
    deleteButton.textContent = "🗑️";
    deleteButton.title = "Delete";
    deleteButton.onclick = (event) => {
      event.stopPropagation();
      deleteProviderSetting(providerSetting.name);
    };

    listItem.appendChild(textSpan);
    listItem.appendChild(duplicateButton);
    listItem.appendChild(editButton);
    listItem.appendChild(deleteButton);
    providerSettingsPopupListEl.appendChild(listItem);
  });
}

function renderVendorDropdown() {
  providerVendorInput.innerHTML = '<option value="">Select Vendor</option>';
  availableVendors.forEach((vendor) => {
    const option = document.createElement("option");
    option.value = vendor;
    option.textContent = vendor;
    providerVendorInput.appendChild(option);
  });
}

function toggleSystemPromptsPopup() {
  systemPromptsPopupVisible = !systemPromptsPopupVisible;
  systemPromptsPopupEl.style.display = systemPromptsPopupVisible
    ? "block"
    : "none";
  if (systemPromptsPopupVisible) {
    renderSystemPromptsList();
  }
}

function toggleUserPromptsPopup() {
  userPromptsPopupVisible = !userPromptsPopupVisible;
  userPromptsPopupEl.style.display = userPromptsPopupVisible ? "block" : "none";
  if (userPromptsPopupVisible) {
    renderUserPromptsList();
  }
}

function toggleToolPopup() {
  toolPopupVisible = !toolPopupVisible;
  toolPopupEl.style.display = toolPopupVisible ? "block" : "none";
  if (toolPopupVisible) {
    renderToolPopupList();
  }
}

function toggleProviderSettingsPopup() {
  providerSettingsPopupVisible = !providerSettingsPopupVisible;
  providerSettingsPopupEl.style.display = providerSettingsPopupVisible
    ? "block"
    : "none";
  if (providerSettingsPopupVisible) {
    renderProviderSettingsPopupList();
    renderVendorDropdown();
    if (editingProviderName === null) {
      handleAddProviderButton();
    }
  }
}

function addSystemPromptToLibrary() {
  const prompt = systemPromptEl.value.trim();
  if (prompt && !systemPrompts.includes(prompt)) {
    systemPrompts = [prompt, ...systemPrompts];
    renderSystemPromptsList();
    sendSettingsUpdate({ systemPromptList: systemPrompts });
  }
}

function addUserPromptToLibrary() {
  const prompt = userInputEl.value.trim();
  if (prompt && !userPrompts.includes(prompt)) {
    userPrompts = [prompt, ...userPrompts];
    renderUserPromptsList();
    sendSettingsUpdate({ userPromptList: userPrompts });
  }
}

function deleteSystemPrompt(prompt) {
  systemPrompts = systemPrompts.filter((p) => p !== prompt);
  renderSystemPromptsList();
  sendSettingsUpdate({ systemPromptList: systemPrompts });
}

function deleteUserPrompt(prompt) {
  userPrompts = userPrompts.filter((p) => p !== prompt);
  renderUserPromptsList();
  sendSettingsUpdate({ userPromptList: userPrompts });
}

function deleteProviderSetting(providerSettingName) {
  providerSettingsList = providerSettingsList.filter(
    (p) => p.name !== providerSettingName
  );
  renderProviderSettingsPopupList();
  sendSettingsUpdate({ providerList: providerSettingsList });
  if (currentProviderSetting?.name === providerSettingName) {
    currentProviderSetting = undefined;
    renderSelectedProvider();
    sendSettingsUpdate({ providerName: null });
  }
  if (editingProviderName === providerSettingName) {
    handleAddProviderButton();
  }
}

function insertSystemPrompt(prompt) {
  systemPromptEl.value = prompt;
  updateSystemPrompt(prompt);
  toggleSystemPromptsPopup();
}

function insertUserPrompt(prompt) {
  userInputEl.value = prompt;
  updateUserPrompt(prompt);
  toggleUserPromptsPopup();
}

function enableTool(toolName) {
  if (!enabledTools.includes(toolName)) {
    enabledTools = [...enabledTools, toolName];
    renderEnabledTools();
    sendSettingsUpdate({ enabledTools: enabledTools });
  }
  toggleToolPopup();
}

function disableTool(toolName) {
  enabledTools = enabledTools.filter((tool) => tool !== toolName);
  renderEnabledTools();
  sendSettingsUpdate({ enabledTools: enabledTools });
}

function selectProviderSetting(providerSettingName) {
  const providerSetting = providerSettingsList.find(
    (p) => p.name === providerSettingName
  );
  if (providerSetting) {
    currentProviderSetting = providerSetting;
    renderSelectedProvider();
    sendSettingsUpdate({ providerName: providerSettingName });
  }
}

function loadProviderSettingToForm(providerSetting) {
  if (providerSetting) {
    editingProviderName = providerSetting.name;
    providerNameInput.value = providerSetting.name;
    providerVendorInput.value = providerSetting.vendor;
    providerApiKeyInput.value = providerSetting.apiKey;
    providerBaseURLInput.value = providerSetting.baseURL || "";
    providerModelInput.value = providerSetting.model;
    providerMaxTokensInput.value = providerSetting.max_tokens?.toString() || "";
    providerTemperatureInput.value =
      providerSetting.temperature?.toString() || "";
    providerProviderInput.value = providerSetting.provider || "";
    clearProviderFormErrors();
  }
}

function handleDuplicateProviderSetting(providerSettingName) {
  const originalProviderSetting = providerSettingsList.find(
    (p) => p.name === providerSettingName
  );
  if (originalProviderSetting) {
    const newProviderSetting = { ...originalProviderSetting };
    let newName = `${originalProviderSetting.name} Copy`;
    let counter = 1;
    while (providerSettingsList.some((p) => p.name === newName)) {
      counter++;
      newName = `${originalProviderSetting.name} Copy ${counter}`;
    }
    newProviderSetting.name = newName;

    providerSettingsList = [...providerSettingsList, newProviderSetting];
    renderProviderSettingsPopupList();
    sendSettingsUpdate({ providerList: providerSettingsList });

    loadProviderSettingToForm(newProviderSetting);
  }
}

function handleAddProviderButton() {
  editingProviderName = null;
  providerNameInput.value = "";
  providerVendorInput.value = "";
  providerApiKeyInput.value = "";
  providerBaseURLInput.value = "";
  providerModelInput.value = "";
  providerMaxTokensInput.value = "";
  providerTemperatureInput.value = "";
  providerProviderInput.value = "";
  clearProviderFormErrors();
}

function clearProviderFormErrors() {
  providerNameError.style.display = "none";
  providerVendorError.style.display = "none";
  providerApiKeyError.style.display = "none";
  providerModelError.style.display = "none";
  providerTemperatureError.style.display = "none";
}

function handleSaveProviderSettings() {
  const providerSetting = {
    name: providerNameInput.value.trim(),
    vendor: providerVendorInput.value,
    apiKey: providerApiKeyInput.value.trim(),
    baseURL: providerBaseURLInput.value.trim() || undefined,
    model: providerModelInput.value.trim(),
    max_tokens: providerMaxTokensInput.value.trim()
      ? parseInt(providerMaxTokensInput.value.trim(), 10)
      : undefined,
    temperature: providerTemperatureInput.value.trim()
      ? parseFloat(providerTemperatureInput.value.trim())
      : undefined,
    provider: providerProviderInput.value.trim(),
  };

  clearProviderFormErrors();

  let isValid = true;
  if (!providerSetting.name) {
    providerNameError.textContent = "Name is required";
    providerNameError.style.display = "block";
    isValid = false;
  } else {
    const existingProvider = providerSettingsList.find(
      (p) => p.name === providerSetting.name
    );
    if (existingProvider && existingProvider.name !== editingProviderName) {
      providerNameError.textContent = `Provider "${providerSetting.name}" already exists.`;
      providerNameError.style.display = "block";
      isValid = false;
    }
  }
  if (!providerSetting.vendor) {
    providerVendorError.textContent = "Vendor is required";
    providerVendorError.style.display = "block";
    isValid = false;
  }
  if (providerSetting.vendor !== "manual") {
    if (!providerSetting.apiKey) {
      providerApiKeyError.textContent = "API Key is required";
      providerApiKeyError.style.display = "block";
      isValid = false;
    }
    if (!providerSetting.model) {
      providerModelError.textContent = "Model is required";
      providerModelError.style.display = "block";
      isValid = false;
    }
  }

  if (
    providerSetting.temperature !== undefined &&
    (isNaN(providerSetting.temperature) ||
      providerSetting.temperature < 0 ||
      providerSetting.temperature > 2)
  ) {
    providerTemperatureError.textContent =
      "Temperature must be a number between 0 and 2";
    providerTemperatureError.style.display = "block";
    isValid = false;
  }

  if (!isValid) {
    return;
  }

  if (editingProviderName) {
    providerSettingsList = providerSettingsList.map((p) =>
      p.name === editingProviderName ? providerSetting : p
    );
  } else {
    providerSettingsList = [...providerSettingsList, providerSetting];
  }

  renderProviderSettingsPopupList();

  const settingsToUpdate = { providerList: providerSettingsList };

  if (
    currentProviderSetting?.name === editingProviderName ||
    (editingProviderName === null && providerSettingsList.length === 1)
  ) {
    currentProviderSetting = providerSetting;
    renderSelectedProvider();
    settingsToUpdate.providerName = providerSetting.name;
  } else if (editingProviderName === null) {
  }

  sendSettingsUpdate(settingsToUpdate);

  handleAddProviderButton();
}

function handleCancelProviderSettings() {
  handleAddProviderButton();
}

function handleCancelProviderSettings() {
  providerFormEl.style.display = "none";
  editingProviderName = null;
}

function togglePrivacySettingsPopup() {
  privacySettingsPopupVisible = !privacySettingsPopupVisible;
  privacySettingsPopupEl.style.display = privacySettingsPopupVisible
    ? "block"
    : "none";
  if (privacySettingsPopupVisible) {
    renderPrivacySettings();
    handleAddPrivacyPairButton();
  }
}

function renderPrivacySettings() {
  privacySettingsPopupListEl.innerHTML = "";
  if (privacySettings.length === 0) {
    const noPairsMessage = document.createElement("li");
    noPairsMessage.textContent = "No masking pairs configured.";
    noPairsMessage.style.textAlign = "center";
    noPairsMessage.style.padding = "10px";
    noPairsMessage.style.color = "var(--text-color)";
    noPairsMessage.style.backgroundColor = "var(--prompt-item-background)";
    privacySettingsPopupListEl.appendChild(noPairsMessage);
    return;
  }
  privacySettings.forEach((pair) => {
    const listItem = document.createElement("li");
    listItem.classList.add("privacy-item");

    const textSpan = document.createElement("span");
    textSpan.classList.add("prompt-text");
    textSpan.textContent = `${pair.search} → ${pair.replace}`;
    listItem.appendChild(textSpan);

    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "flex";

    const editButton = document.createElement("button");
    editButton.classList.add("edit-button");
    editButton.textContent = "✏️";
    editButton.title = "Edit";
    editButton.onclick = (event) => {
      event.stopPropagation();
      loadPrivacyPairToForm(pair);
    };
    buttonsContainer.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-button");
    deleteButton.textContent = "🗑️";
    deleteButton.title = "Delete";
    deleteButton.onclick = (event) => {
      event.stopPropagation();
      deletePrivacyPair(pair.search);
    };
    buttonsContainer.appendChild(deleteButton);

    listItem.appendChild(buttonsContainer);
    privacySettingsPopupListEl.appendChild(listItem);
  });
}

function handleAddPrivacyPairButton() {
  editingPrivacyPairSearch = null;
  privacySearchInput.value = "";
  privacyReplaceInput.value = "";
  clearPrivacyFormErrors();
  privacyFormEl.style.display = "block";
}

function loadPrivacyPairToForm(pair) {
  editingPrivacyPairSearch = pair.search;
  privacySearchInput.value = pair.search;
  privacyReplaceInput.value = pair.replace;
  clearPrivacyFormErrors();
  privacyFormEl.style.display = "block";
}

function handleSavePrivacyPair() {
  const search = privacySearchInput.value.trim();
  const replace = privacyReplaceInput.value.trim();

  clearPrivacyFormErrors();

  let isValid = true;
  if (!search) {
    privacySearchError.textContent = "Sensitive string cannot be empty.";
    privacySearchError.style.display = "block";
    isValid = false;
  }

  if (!isValid) {
    return;
  }

  if (editingPrivacyPairSearch !== null) {
    const index = privacySettings.findIndex(
      (p) => p.search === editingPrivacyPairSearch
    );
    if (index !== -1) {
      if (
        search !== editingPrivacyPairSearch &&
        privacySettings.some((p) => p.search === search)
      ) {
        privacySearchError.textContent = `A pair with sensitive string "${search}" already exists.`;
        privacySearchError.style.display = "block";
        return;
      }
      privacySettings[index] = { search, replace };
    }
  } else {
    if (privacySettings.some((p) => p.search === search)) {
      privacySearchError.textContent = `A pair with sensitive string "${search}" already exists.`;
      privacySearchError.style.display = "block";
      return;
    }
    privacySettings.push({ search, replace });
  }

  sendSettingsUpdate({ privacySettings: privacySettings });
  renderPrivacySettings();
  handleAddPrivacyPairButton();
}

function handleCancelPrivacyPair() {
  privacyFormEl.style.display = "none";
  editingPrivacyPairSearch = null;
  clearPrivacyFormErrors();
}

function deletePrivacyPair(searchString) {
  privacySettings = privacySettings.filter((p) => p.search !== searchString);
  sendSettingsUpdate({ privacySettings: privacySettings });
  renderPrivacySettings();
  if (editingPrivacyPairSearch === searchString) {
    handleAddPrivacyPairButton();
  }
}

function clearPrivacyFormErrors() {
  privacySearchError.style.display = "none";
  privacyReplaceError.style.display = "none";
  privacySearchError.textContent = "";
  privacyReplaceError.textContent = "";
}

window.addEventListener("load", () => {
  loadState();
  renderChatHistory();
  renderSelectedFiles();

  document.addEventListener("click", function (event) {
    if (
      systemPromptsPopupVisible &&
      !systemPromptsPopupEl.contains(event.target) &&
      event.target !== document.getElementById("systemPromptInput") &&
      event.target !== systemPromptLoadButton
    ) {
      toggleSystemPromptsPopup();
    }
    if (
      userPromptsPopupVisible &&
      !userPromptsPopupEl.contains(event.target) &&
      event.target !== document.getElementById("userInput") &&
      event.target !== userPromptLoadButton
    ) {
      toggleUserPromptsPopup();
    }
    if (
      toolPopupVisible &&
      !toolPopupEl.contains(event.target) &&
      event.target !== addToolButton
    ) {
      toggleToolPopup();
    }
    if (
      providerSettingsPopupVisible &&
      !providerSettingsPopupEl.contains(event.target) &&
      event.target !== providerSettingsButton
    ) {
      toggleProviderSettingsPopup();
    }
    if (
      privacySettingsPopupVisible &&
      !privacySettingsPopupEl.contains(event.target) &&
      event.target !== privacySettingsButton &&
      event.target !== isPrivacyMaskingEnabledCheckbox
    ) {
      togglePrivacySettingsPopup();
    }
  });

  messagesContainer.addEventListener("click", (event) => {
    const header = event.target.closest(".message-header");
    if (header) {
      const messageEl = header.closest(".message");
      if (
        !event.target.classList.contains("cancel-button") &&
        messageEl &&
        !header.classList.contains("non-collapsible")
      ) {
        const messageId = messageEl.id.replace("message-", "");
        toggleMessageCollapse(messageId, messagesContainer);
      }
    }
  });
});

userInputEl.addEventListener("input", (e) => {
  updateUserPrompt(e.target.value);
});

systemPromptEl.addEventListener("input", (e) => {
  updateSystemPrompt(e.target.value);
});

runCommandInputEl.addEventListener("input", (e) => {
  updateRunCommand(e.target.value);
});

shellSelectorEl.addEventListener("change", (e) => {
  currentSelectedShell = e.target.value;
});

autoRemoveCommentsCheckbox.addEventListener("change", () => {
  sendSettingsUpdate({
    autoRemoveComments: autoRemoveCommentsCheckbox.checked,
  });
});
autoFormatCheckbox.addEventListener("change", () => {
  sendSettingsUpdate({ autoFormat: autoFormatCheckbox.checked });
});
autoFixErrorsCheckbox.addEventListener("change", () => {
  sendSettingsUpdate({ autoFixErrors: autoFixErrorsCheckbox.checked });
});

autoGenerateCommitCheckbox.addEventListener("change", () => {
  const isChecked = autoGenerateCommitCheckbox.checked;
  autoGenerateCommit = isChecked;
  useConventionalCommitsCheckbox.disabled = !isChecked;
  const settingsToUpdate = { autoGenerateCommit: isChecked };
  if (!isChecked) {
    useConventionalCommitsCheckbox.checked = false;
    useConventionalCommits = false;
    settingsToUpdate.useConventionalCommits = false;
  }
  sendSettingsUpdate(settingsToUpdate);
});

useConventionalCommitsCheckbox.addEventListener("change", () => {
  useConventionalCommits = useConventionalCommitsCheckbox.checked;
  sendSettingsUpdate({ useConventionalCommits });
});
isPrivacyMaskingEnabledCheckbox.addEventListener("change", () => {
  isPrivacyMaskingEnabled = isPrivacyMaskingEnabledCheckbox.checked;
  sendSettingsUpdate({ isPrivacyMaskingEnabled });
});
includeCodebaseSummaryCheckbox.addEventListener("change", () => {
  includeCodebaseSummary = includeCodebaseSummaryCheckbox.checked;
  sendSettingsUpdate({ includeCodebaseSummary });
});

window.addEventListener("message", (event) => {
  const message = event.data;

  if (message.command === "log") {
    const { id, parentId, message: taskLog } = message;

    let targetContainer = messagesContainer;
    let parentMessageEl = null;

    if (parentId) {
      parentMessageEl = messagesContainer.querySelector(`#message-${parentId}`);

      if (parentMessageEl) {
        let childMessagesContainer = parentMessageEl.querySelector(
          ".child-messages-container"
        );
        if (!childMessagesContainer) {
          childMessagesContainer = document.createElement("div");
          childMessagesContainer.classList.add("child-messages-container");
          const messageBodyContent = parentMessageEl.querySelector(
            ".message-body-content"
          );
          if (messageBodyContent) {
            messageBodyContent.appendChild(childMessagesContainer);
          } else {
            const collapsibleContent = parentMessageEl.querySelector(
              ".collapsible-content"
            );
            if (collapsibleContent) {
              collapsibleContent.appendChild(childMessagesContainer);
            } else {
              parentMessageEl.appendChild(childMessagesContainer);
            }
          }
        }
        childMessagesContainer.style.display = "";
        targetContainer = childMessagesContainer;
      } else {
        console.warn(
          `Log message ${id} received with unknown parentId: ${parentId}. Logging to main container.`
        );
        targetContainer = messagesContainer;
      }
    }

    const existingEl = targetContainer.querySelector(`#message-${id}`);

    if (existingEl) {
      updateMessageElement(
        id,
        {
          type: taskLog.type,
          summary: taskLog.summary,
          detail: taskLog.detail,
          progress: taskLog.progress,
          formSchema: taskLog.formSchema,
        },
        targetContainer
      );
    } else {
      renderMessage(
        {
          id,
          type: taskLog.type,
          summary: taskLog.summary,
          detail: taskLog.detail,
          progress: taskLog.progress,
          isCollapsed: [
            "prompt",
            "tool",
            "log",
            "info",
            "warning",
            "error",
          ].includes(taskLog.type || "log"),
          formSchema: taskLog.formSchema,
        },
        targetContainer
      );
    }

    if (parentMessageEl) {
      updateMessageCollapsibility(parentMessageEl);
    }

    scrollToBottom();
    return;
  }

  switch (message.command) {
    case "promptForm":
      {
        const formRequest = message.formRequest;
        let formTargetContainer = messagesContainer;
        let formParentMessageEl = null;

        if (formRequest.parentId) {
          formParentMessageEl = messagesContainer.querySelector(
            `#message-${formRequest.parentId}`
          );
          if (formParentMessageEl) {
            let childMessagesContainer = formParentMessageEl.querySelector(
              ".child-messages-container"
            );
            if (!childMessagesContainer) {
              childMessagesContainer = document.createElement("div");
              childMessagesContainer.classList.add("child-messages-container");
              const messageBodyContent = formParentMessageEl.querySelector(
                ".message-body-content"
              );
              if (messageBodyContent) {
                messageBodyContent.appendChild(childMessagesContainer);
              } else {
                const collapsibleContent = formParentMessageEl.querySelector(
                  ".collapsible-content"
                );
                if (collapsibleContent) {
                  collapsibleContent.appendChild(childMessagesContainer);
                } else {
                  formParentMessageEl.appendChild(childMessagesContainer);
                }
              }
              childMessagesContainer.style.display = "";
              formTargetContainer = childMessagesContainer;
            } else {
              formTargetContainer = childMessagesContainer;
            }
          }
        }
        renderMessage(
          {
            id: formRequest.id,
            type: "form-prompt",
            summary: formRequest.message,
            detail: "",
            isCollapsed: false,
            formSchema: formRequest.schema,
          },
          formTargetContainer
        );

        if (formParentMessageEl) {
          updateMessageCollapsibility(formParentMessageEl);
        }
        scrollToBottom();
      }
      break;

    case "updateMessage":
      updateMainChatMessageHistory(
        message.messageId,
        message.detail || message.text || "",
        message.summary,
        message.sender,
        message.messageType
      );
      updateMessageElement(message.messageId, {
        type: message.messageType,
        summary: message.summary,
        detail: message.detail || message.text || "",
        formSchema: null,
      });
      scrollToBottom();
      break;
    case "clearMessages":
      clearChatHistory();
      break;
    case "setOpenFiles":
      openFiles = message.files;
      saveState();
      renderSelectedFiles();
      break;
    case "addFiles":
      addFiles(message.filePaths);
      break;
    case "openFilesDialog":
      openFilesDialog();
      break;
    case "settingsUpdated":
      const settings = message.settings;
      currentSystemPrompt = settings.systemPrompt || "";
      currentUserPrompt = settings.userPrompt || "";
      if (document.activeElement !== systemPromptEl) {
        systemPromptEl.value = currentSystemPrompt;
      }
      if (document.activeElement !== userInputEl) {
        userInputEl.value = currentUserPrompt;
      }
      currentRunCommand = settings.runCommand || "";
      if (document.activeElement !== runCommandInputEl) {
        runCommandInputEl.value = currentRunCommand;
      }

      systemPrompts = settings.systemPromptList || [];
      userPrompts = settings.userPromptList || [];
      const currentEditingNameBeforeUpdate = editingProviderName;
      providerSettingsList = settings.providerList || [];
      enabledTools = settings.enabledTools || [];
      autoRemoveComments = settings.autoRemoveComments ?? true;
      autoFormat = settings.autoFormat ?? true;
      autoFixErrors = settings.autoFixErrors ?? true;
      privacySettings = settings.privacySettings || [];
      isPrivacyMaskingEnabled = settings.isPrivacyMaskingEnabled ?? false;

      currentProviderSetting = message.currentProviderSetting;
      availableVendors = message.availableVendors || [];
      availableTools = message.availableTools || [];
      availableShells = message.availableShells || [];

      autoRemoveCommentsCheckbox.checked = autoRemoveComments;
      autoFormatCheckbox.checked = autoFormat;
      autoFixErrorsCheckbox.checked = autoFixErrors;

      autoGenerateCommit = settings.autoGenerateCommit ?? false;
      autoGenerateCommitCheckbox.checked = autoGenerateCommit;
      useConventionalCommitsCheckbox.disabled = !autoGenerateCommit;

      useConventionalCommits = settings.useConventionalCommits ?? false;
      useConventionalCommitsCheckbox.checked = useConventionalCommits;
      includeCodebaseSummary = settings.includeCodebaseSummary ?? false;
      includeCodebaseSummaryCheckbox.checked = includeCodebaseSummary;
      isPrivacyMaskingEnabledCheckbox.checked = isPrivacyMaskingEnabled;

      renderSystemPromptsList();
      renderUserPromptsList();
      renderEnabledTools();
      renderSelectedProvider();
      renderProviderSettingsPopupList();
      renderVendorDropdown();
      renderToolPopupList();
      renderAvailableShells();
      renderPrivacySettings();
      renderSelectedFiles();

      const wasEditing = currentEditingNameBeforeUpdate !== null;
      const editedProviderStillExists = wasEditing
        ? providerSettingsList.some(
            (p) => p.name === currentEditingNameBeforeUpdate
          )
        : false;

      if (wasEditing && editedProviderStillExists) {
        const currentEditingProvider = providerSettingsList.find(
          (p) => p.name === currentEditingNameBeforeUpdate
        );
        if (currentEditingProvider) {
          loadProviderSettingToForm(currentEditingProvider);
        } else {
          handleAddProviderButton();
        }
      } else {
        handleAddProviderButton();
      }

      break;
    case "resetSendButton":
      resetSendButton();
      break;
    case "resetPlanButton":
      resetPlanButton();
      break;
    case "resetRunCommandButton":
      resetRunCommandButton();
      break;

    default:
      console.warn("Unknown command:", message.command);
  }
});

window.handleSendMessage = handleSendMessage;
window.handlePlanAndExecute = handlePlanAndExecute;
window.handleRunCommand = handleRunCommand;
window.handleCancelTask = handleCancelTask;
window.clearChatHistory = clearChatHistory;
window.addFilesDialog = addFilesDialog;
window.allowDrop = allowDrop;
window.dropHandler = dropHandler;
window.toggleSystemPromptsPopup = toggleSystemPromptsPopup;
window.toggleUserPromptsPopup = toggleUserPromptsPopup;
window.toggleToolPopup = toggleToolPopup;
window.toggleProviderSettingsPopup = toggleProviderSettingsPopup;
window.addSystemPromptToLibrary = addSystemPromptToLibrary;
window.addUserPromptToLibrary = addUserPromptToLibrary;
window.deleteSystemPrompt = deleteSystemPrompt;
window.deleteUserPrompt = deleteUserPrompt;
window.deleteProviderSetting = deleteProviderSetting;
window.insertSystemPrompt = insertSystemPrompt;
window.insertUserPrompt = insertUserPrompt;
window.enableTool = enableTool;
window.disableTool = disableTool;
window.selectProviderSetting = selectProviderSetting;
window.loadProviderSettingToForm = loadProviderSettingToForm;
window.handleAddProviderButton = handleAddProviderButton;
window.handleDuplicateProviderSetting = handleDuplicateProviderSetting;
window.handleCancelProviderSettings = handleCancelProviderSettings;
window.clearProviderFormErrors = clearProviderFormErrors;
window.handleSaveProviderSettings = handleSaveProviderSettings;
window.toggleMessageCollapse = toggleMessageCollapse;
window.handleRemoveComments = handleRemoveComments;
window.handleFormat = handleFormat;
window.handleFixErrors = handleFixErrors;
window.handleCommitFiles = handleCommitFiles;
window.handleTestTask = handleTestTask;
window.handleTestMultiTask = handleTestMultiTask;
window.handleTestSerialTask = handleTestSerialTask;
window.handleTestFormTask = handleTestFormTask;
window.togglePrivacySettingsPopup = togglePrivacySettingsPopup;
window.handleSavePrivacyPair = handleSavePrivacyPair;
window.handleCancelPrivacyPair = handleCancelPrivacyPair;
window.handleAddPrivacyPairButton = handleAddPrivacyPairButton;
window.handleShowCodebaseSummary = handleShowCodebaseSummary;
