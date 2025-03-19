export default (tabId: string) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ask AI</title>
    <style>
      :root {
        --background-color: #f4f4f4;
        --text-color: #000;
        --textarea-background: #fff;
        --textarea-border: #ccc;
        --button-background: #007acc;
        --button-hover: #005fa3;
        --pre-background: #e0e0e0;
        --pre-border: #ccc;
        --user-message-background: #e0f7fa;
        --assistant-message-background: #f0f0f0;
        --system-message-background: #f8e6ff;
        --prompt-message-background: #f8e6ff;
        --log-message-background: #e0e0e0;
        --error-message-background: #ffe0b2;
        --warning-message-background: #fff9c4;
        --info-message-background: #bbdefb;
        --loading-message-background: #e8f5e9;
        --file-button-background: #ddd;
        --file-button-hover: #ccc;
        --file-button-remove-hover: #f44336;
        --file-button-text-color: #000;
        --prompts-header-background: #ddd;
        --prompts-header-hover: #ccc;
        --prompt-item-background: #eee;
        --prompt-item-hover: #ddd;
        --prompt-delete-button-hover: #f44336;
        --popup-background: var(--background-color);
        --popup-border: var(--pre-border);
        --popup-shadow: 0 4px 8px rgba(0,0,0,0.1);
        --tool-button-background: var(--file-button-background);
        --tool-button-hover: var(--file-button-hover);
        --tool-button-remove-hover: var(--file-button-remove-hover);
        --tool-button-text-color: var(--file-button-text-color);
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --background-color: #1e1e1e;
          --text-color: #ccc;
          --textarea-background: #252526;
          --textarea-border: #555;
          --button-background: #007acc;
          --button-hover: #005fa3;
          --pre-background: #252526;
          --pre-border: #555;
          --user-message-background: #2a3c42;
          --assistant-message-background: #333333;
          --system-message-background: #4a2d57;
          --prompt-message-background: #4a2d57;
          --log-message-background: #333333;
          --error-message-background: #572c0f;
          --warning-message-background: #554d00;
          --info-message-background: #2a3c42;
          --loading-message-background: #1e3628;
          --file-button-background: #555;
          --file-button-hover: #666;
          --file-button-remove-hover: #e57373;
          --file-button-text-color: #eee;
          --prompts-header-background: #555;
          --prompts-header-hover: #666;
          --prompt-item-background: #444;
          --prompt-item-hover: #555;
          --prompt-delete-button-hover: #e57373;
          --popup-background: var(--background-color);
          --popup-border: var(--pre-border);
          --popup-shadow: 0 4px 8px rgba(0,0,0,0.2);
          --tool-button-background: var(--file-button-background);
          --tool-button-hover: var(--file-button-hover);
          --tool-button-remove-hover: var(--file-button-remove-hover);
          --tool-button-text-color: var(--file-button-text-color);
        }
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: var(--background-color);
        color: var(--text-color);
      }
      #selected-files-container, #enabled-tools-container {
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .file-button, .tool-button {
        background-color: var(--tool-button-background);
        color: var(--tool-button-text-color);
        border: none;
        padding: 5px 10px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.9em;
      }
      .file-button:hover, .tool-button:hover {
        background-color: var(--tool-button-hover);
      }
      .file-button .remove-file-button, .tool-button .remove-tool-button {
        background: none;
        border: none;
        color: var(--tool-button-text-color);
        cursor: pointer;
        padding: 0 5px;
        border-radius: 3px;
      }
      .file-button .remove-file-button:hover, .tool-button .remove-tool-button:hover {
        color: white;
        background-color: var(--tool-button-remove-hover);
      }
      .input-area {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .input-row {
        display: flex;
        gap: 10px;
        align-items: flex-start; /* Align items to the start to position buttons correctly */
        position: relative; /* needed for popup positioning */
      }
      textarea {
        box-sizing: border-box;
        width: 100%;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid var(--textarea-border);
        background-color: var(--textarea-background);
        color: var(--text-color);
        resize: vertical;
      }
      .prompt-buttons {
        display: flex;
        flex-direction: column;
        gap: 5px;
        align-self: stretch; /* Make buttons container stretch to textarea height */
      }
      .prompt-buttons button {
        flex-grow: 1; /* Distribute space evenly */
        padding: 8px 10px; /* Slightly smaller padding for prompt buttons */
        font-size: 0.9em;
      }
      .button-row {
        display: flex;
        gap: 10px;
      }
      button {
        padding: 10px 15px;
        border: none;
        background-color: var(--button-background);
        color: white;
        border-radius: 5px;
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background-color: var(--button-hover);
      }
      pre {
        background-color: var(--pre-background);
        padding: 10px;
        border-radius: 5px;
        border: 1px solid var(--pre-border);
        white-space: pre-wrap;
        color: var(--text-color);
        margin-bottom: 5px;
        overflow-x: auto;
        position: relative;
      }
      .message-type-badge {
        position: absolute;
        top: 5px;
        right: 5px;
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 0.7em;
        background-color: rgba(0, 0, 0, 0.2);
        color: white;
      }
      .message {
        word-wrap: break-word;
      }
      .user-message { background-color: var(--user-message-background); }
      .assistant-message { background-color: var(--assistant-message-background); }
      .system-message { background-color: var(--system-message-background); }
      .prompt-message { background-color: var(--prompt-message-background); }
      .log-message { background-color: var(--log-message-background); }
      .error-message { background-color: var(--error-message-background); }
      .warning-message { background-color: var(--warning-message-background); }
      .info-message { background-color: var(--info-message-background); }
      .loading-message { background-color: var(--loading-message-background); }
      .loader {
        width: 20px;
        height: 20px;
        border: 3px solid white;
        border-top: 3px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

      .prompts-section { margin-bottom: 15px; }
      .prompts-header {
        background-color: var(--prompts-header-background);
        padding: 10px;
        border-radius: 5px 5px 0 0;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .prompts-header:hover { background-color: var(--prompts-header-hover); }
      .prompts-list {
        list-style: none;
        padding: 0;
        margin: 0;
        border: 1px solid var(--pre-border);
        border-top: none;
        border-radius: 0 0 5px 5px;
        overflow: hidden; /* Ensure rounded corners are visible */
      }
      .prompt-item {
        background-color: var(--prompt-item-background);
        padding: 10px;
        border-bottom: 1px solid var(--pre-border);
        display: flex;
        justify-content: space-between;
        align-items: flex-start; /* changed from center to start to align multiline text nicely */
        cursor: pointer;
        word-wrap: break-word; /* Allow text to wrap */
        white-space: normal; /* Ensure text wraps within item */
      }
      .prompt-item:last-child { border-bottom: none; }
      .prompt-item:hover { background-color: var(--prompt-item-hover); }
      .prompt-delete-button {
        background: none;
        border: none;
        color: var(--file-button-text-color);
        cursor: pointer;
        padding: 0 5px;
        border-radius: 3px;
        font-size: 0.8em;
      }
      .prompt-delete-button:hover {
        color: white;
        background-color: var(--prompt-delete-button-hover);
      }
      .prompt-text { flex-grow: 1; margin-right: 10px;  word-wrap: break-word; /* Ensure text wrapping in text span too */}

      .prompt-popup, .tool-popup {
        position: fixed; /* Changed to fixed */
        z-index: 10; /* Ensure it's on top of other content */
        background-color: var(--popup-background);
        border: 1px solid var(--popup-border);
        border-radius: 5px;
        box-shadow: var(--popup-shadow);
        padding: 10px;
        display: none; /* Hidden by default */
        top: 0; /* Placeholder, will be set by JS */
        right: 0; /* Placeholder, will be set by JS */
        max-height: 300px; /* Added max height for popup */
        overflow-y: auto; /* Added scroll if popup is too tall */
        max-width: 80vw; /* Limit popup width to viewport width */
      }
      .prompt-popup .prompts-list, .tool-popup .tool-list {
        border: none; /* Remove border from list inside popup as it has its own border */
        overflow-y: auto; /* Enable scroll for list within popup if needed - redundant because popup has scroll now */
        max-height: unset; /* Remove max height from list inside popup - popup controls height now */
      }
      .tool-popup .tool-list .tool-item {
        background-color: var(--prompt-item-background);
        padding: 10px;
        border-bottom: 1px solid var(--pre-border);
        display: flex;
        justify-content: space-between;
        align-items: flex-start; /* changed from center to start to align multiline text nicely */
        cursor: pointer;
        word-wrap: break-word; /* Allow text to wrap */
        white-space: normal; /* Ensure text wraps within item */
      }
      .tool-popup .tool-list .tool-item:last-child { border-bottom: none; }
      .tool-popup .tool-list .tool-item:hover { background-color: var(--prompt-item-hover); }


    </style>
  </head>
  <body ondragover="allowDrop(event)" ondrop="dropHandler(event)">
    <main>

      <div class="prompts-section" style="display:none;"> <!-- Hiding old header section -->
        <div class="prompts-header" onclick="toggleSystemPromptsList()">
          <span>System Prompt Library</span>
          <span id="system-prompts-toggle-icon">▼</span>
        </div>
        <ul id="system-prompts-list" class="prompts-list" style="display: none;"></ul>
      </div>

      <div class="prompts-section" style="display:none;"> <!-- Hiding old header section -->
        <div class="prompts-header" onclick="toggleUserPromptsList()">
          <span>User Prompt Library</span>
          <span id="user-prompts-toggle-icon">▼</span>
        </div>
        <ul id="user-prompts-list" class="prompts-list" style="display: none;"></ul>
      </div>

      <div id="enabled-tools-container">
      </div>
      <div id="tool-popup" class="tool-popup">
        <ul id="tool-popup-list" class="tool-list"></ul>
      </div>


      <div id="selected-files-container"></div>
      <div class="input-area">

        <div class="input-row">
          <textarea id="systemPromptInput" rows="2" placeholder="Edit system prompt here..."></textarea>
          <div class="prompt-buttons">
            <button onclick="toggleSystemPromptsPopup()">Load</button>
            <button onclick="addSystemPromptToLibrary()">Save</button>
          </div>
        </div>
        <div id="system-prompts-popup" class="prompt-popup">
          <ul id="system-prompts-popup-list" class="prompts-list"></ul>
        </div>


        <div class="input-row">
          <textarea id="userInput" rows="4" placeholder="Type your message here..."></textarea>
          <div class="prompt-buttons">
            <button onclick="toggleUserPromptsPopup()">Load</button>
            <button onclick="addUserPromptToLibrary()">Save</button>
          </div>
        </div>
        <div id="user-prompts-popup" class="prompt-popup">
          <ul id="user-prompts-popup-list" class="prompts-list"></ul>
        </div>


        <div class="button-row">
          <button id="sendButton" onclick="handleSendMessage()">
            <span id="buttonText">Send</span>
            <span id="loader" class="loader" style="display:none;"></span>
          </button>
          <button id="clearButton" onclick="clearChatHistory()">Clear</button>
          <button id="addFilesButton" onclick="addFilesDialog()">Add Files</button>
          <button id="addToolButton" onclick="toggleToolPopup()">Add Tool</button>
        </div>
      </div>
      <div id="messages-container"></div>
    </main>
    <script>
      // @ts-ignore
      const vscode = acquireVsCodeApi();
      const tabId = "${tabId}";

      /**
       * @typedef {Object} ChatMessage
       * @property {string} id
       * @property {string} text
       * @property {string} sender
       * @property {string} [messageType] - Type of message for styling (user, assistant, log, etc.)
       */
      /** @type {ChatMessage[]} */
      let chatHistory = [];
      /** @type {string[]} */
      let openFiles = [];
      /** @type {string[]} */
      let systemPrompts = []; // Will be updated by message
      /** @type {string[]} */
      let userPrompts = []; // Will be updated by message
      /** @type {string[]} */
      let availableTools = []; // Will be updated by message on init
      /** @type {string[]} */
      let enabledTools = []; // Will be updated by message on init and user actions
      let systemPromptsPopupVisible = false;
      let userPromptsPopupVisible = false;
      let toolPopupVisible = false;
      /** @type {string} */
      let currentSystemPrompt = ""; // Placeholder, will be initialized by message
      /** @type {string} */
      let currentUserPrompt = ""; // Placeholder, will be initialized by message


      const STORAGE_KEYS = {
        chatHistory: \`chatMessages-\${tabId}\`,
        userInput: \`userInput-\${tabId}\`,
        openFiles: \`openFiles-\${tabId}\`,
        enabledTools: \`enabledTools-\${tabId}\` // Key for enabled tools
      };

      // DOM elements
      const messagesContainer = document.getElementById("messages-container");
      const userInputEl = document.getElementById("userInput");
      const systemPromptEl = document.getElementById("systemPromptInput");
      const sendButton = document.getElementById("sendButton");
      const buttonText = document.getElementById("buttonText");
      const loader = document.getElementById("loader");
      const selectedFilesContainer = document.getElementById("selected-files-container");
      const enabledToolsContainer = document.getElementById("enabled-tools-container"); // Enabled tools container
      const systemPromptsPopupEl = document.getElementById("system-prompts-popup");
      const userPromptsPopupEl = document.getElementById("user-prompts-popup");
      const systemPromptsPopupListEl = document.getElementById("system-prompts-popup-list");
      const userPromptsPopupListEl = document.getElementById("user-prompts-popup-list");
      const systemPromptLoadButton = document.querySelector('#systemPromptInput + .prompt-buttons > button:nth-child(1)');
      const userPromptLoadButton = document.querySelector('#userInput + .prompt-buttons > button:nth-child(1)');
      const toolPopupEl = document.getElementById("tool-popup");
      const toolPopupListEl = document.getElementById("tool-popup-list");
      const addToolButton = document.getElementById("addToolButton");


      /**
       * Loads state from localStorage: chat history and open files.
       */
      function loadState() {
        chatHistory = loadFromLocalStorage(STORAGE_KEYS.chatHistory, []);
        openFiles = loadFromLocalStorage(STORAGE_KEYS.openFiles, []);
        enabledTools = loadFromLocalStorage(STORAGE_KEYS.enabledTools, []); // Load enabled tools from localStorage
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
          console.error(\`Error parsing localStorage key \${key}: \`, e);
          return defaultValue;
        }
      }

      /**
       * Saves state to localStorage: chat history and open files.
       */
      function saveState() {
        saveToLocalStorage(STORAGE_KEYS.chatHistory, chatHistory);
        saveToLocalStorage(STORAGE_KEYS.openFiles, openFiles);
        saveToLocalStorage(STORAGE_KEYS.enabledTools, enabledTools); // Save enabled tools to localStorage
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
        messagesContainer.innerHTML = ""; // Clear existing messages
        chatHistory.forEach(renderMessage);
        scrollToBottom();
      }

      /**
       * Creates and appends a message element to the messages container.
       * @param {ChatMessage} msg - Chat message object.
       */
      function renderMessage({ id, text, sender, messageType = 'log' }) {
        const el = document.createElement('pre');
        el.textContent = text;
        el.classList.add('message'); // General message styling
        el.classList.add(\`\${messageType}-message\`); // Message type specific styling (background color)

        const badge = document.createElement('span');
        badge.classList.add('message-type-badge');
        badge.textContent = messageType;
        el.appendChild(badge);

        if (id) el.id = \`message-\${id}\`;
        messagesContainer.appendChild(el);
      }

      /**
       * Adds a new message to the chat history, saves state, and re-renders.
       * @param {string} text - Message text.
       * @param {string} sender - Sender of the message (user, assistant, etc.).
       * @param {string} [messageType='log'] - Type of message (log, error, etc.) for styling.
       * @returns {string} - The ID of the newly added message.
       */
      function addChatMessage(text, sender, messageType = 'log') {
        /** @type ChatMessage */
        const message = {
          id: Date.now().toString(),
          text,
          sender,
          messageType
        };
        chatHistory.push(message);
        saveState();
        renderChatHistory();
        return message.id;
      }

      /**
       * Updates an existing chat message, saves state, and re-renders.
       * @param {string} id - ID of the message to update.
       * @param {string} newText - New message text.
       * @param {string} newSender - New sender.
       * @param {string} newMessageType - New message type.
       */
      function updateChatMessage(id, newText, newSender, newMessageType) {
        const msg = chatHistory.find(m => m.id === id);
        if (msg) {
          msg.text = newText;
          msg.sender = newSender;
          msg.messageType = newMessageType;
          saveState();
          renderChatHistory();
        }
      }

      /**
       * Clears chat history from memory and localStorage, then re-renders.
       */
      function clearChatHistory() {
        chatHistory = [];
        localStorage.removeItem(STORAGE_KEYS.chatHistory);
        renderChatHistory();
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

      // Debounced update for the system prompt. Sends to extension to save to workspace state.
      const updateSystemPrompt = debounce((value) => {
        vscode.postMessage({ command: "setSystemPrompt", systemPrompt: value });
      }, 3000);

      // Debounced update for the user prompt. Sends to extension to save to workspace state.
      const updateUserPrompt = debounce((value) => {
        vscode.postMessage({ command: "setUserPrompt", userPrompt: value });
      }, 3000);


      /**
       * Resets the send button state to enable and hide loader.
       */
      function resetSendButton() {
        sendButton.disabled = false;
        loader.style.display = "none";
        buttonText.textContent = "Send";
      }

      /**
       * Renders the selected files in the UI.
       */
      function renderSelectedFiles() {
        selectedFilesContainer.innerHTML = '';
        openFiles.forEach(filePath => {
          const fileButton = document.createElement('div');
          fileButton.classList.add('file-button');
          fileButton.textContent = filePath;

          const removeButton = document.createElement('button');
          removeButton.classList.add('remove-file-button');
          removeButton.textContent = '✕';
          removeButton.onclick = () => removeFile(filePath);

          fileButton.appendChild(removeButton);
          selectedFilesContainer.appendChild(fileButton);
        });
      }

      /**
       * Renders the enabled tools in the UI.
       */
      function renderEnabledTools() {
        enabledToolsContainer.innerHTML = ''; // Clear old buttons first
        enabledTools.forEach(toolName => {
          const toolButton = document.createElement('div');
          toolButton.classList.add('tool-button');
          toolButton.textContent = toolName;

          const removeButton = document.createElement('button');
          removeButton.classList.add('remove-tool-button');
          removeButton.textContent = '✕';
          removeButton.onclick = () => disableTool(toolName);

          toolButton.appendChild(removeButton);
          enabledToolsContainer.appendChild(toolButton);
        });
      }


      /**
       * Removes a file from the open files list and updates UI and extension.
       * @param {string} filePath - Path of the file to remove.
       */
      function removeFile(filePath) {
        openFiles = openFiles.filter(file => file !== filePath);
        saveState();
        renderSelectedFiles();
        vscode.postMessage({ command: "removeFile", filePath: filePath });
      }

      /**
       * Adds files to the open files list, updates UI and extension.
       * Prevents duplicate file paths.
       * @param {string[]} files - Array of file paths to add.
       */
      function addFiles(files) {
        const newFiles = files.filter(filePath => !openFiles.includes(filePath));
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
        vscode.postMessage({ command: "requestAddFiles" });
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
          // Use DataTransferItemList interface to access the file system
          const items = Array.from(event.dataTransfer.items);
          filePaths = await Promise.all(items.map(item => { // Changed to await Promise.all
            if (item.kind === 'file') {
              const file = item.getAsFile();
              return file ? file.path : null;
            }
            return null;
          })).then(paths => paths.filter(path => path !== null));
        } else {
          // Use DataTransfer interface to access file URI list
          filePaths = Array.from(event.dataTransfer.files).map(file => file.path);
        }

        if (filePaths.length > 0) {
          vscode.postMessage({ command: "addFilesFromDialog", filePaths: filePaths });
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
        sendButton.disabled = true;
        loader.style.display = "inline-block";
        buttonText.textContent = "";
        const messageId = addChatMessage(user, "user");
        vscode.postMessage({
          command: "sendMessage",
          user: user, // changed from text: text to user: user
          system: system, // changed from systemPrompt: systemPrompt to system: system
          fileNames: openFiles, // add fileNames
          toolNames: enabledTools, // add toolNames
          messageId
        });
      }

      /**
       * Displays a temporary loading message in the chat.
       * @param {string} messageId - ID to assign to the loading message.
       */
      function showLoadingMessage(messageId) {
        addChatMessage("Loading response...", "assistant", "loading");
      }

      function renderSystemPromptsList() {
        systemPromptsPopupListEl.innerHTML = '';
        systemPrompts.forEach(prompt => {
          const listItem = document.createElement('li');
          listItem.classList.add('prompt-item');

          const textSpan = document.createElement('span');
          textSpan.classList.add('prompt-text');
          textSpan.textContent = prompt;
          listItem.onclick = () => insertSystemPrompt(prompt); // Insert prompt on click - whole item clickable now

          const deleteButton = document.createElement('button');
          deleteButton.classList.add('prompt-delete-button');
          deleteButton.textContent = '✕';
          deleteButton.onclick = (event) => {
            event.stopPropagation(); // Prevent item click when delete is clicked
            deleteSystemPrompt(prompt);
          };

          listItem.appendChild(textSpan);
          listItem.appendChild(deleteButton);
          systemPromptsPopupListEl.appendChild(listItem);
        });
      }

      function renderUserPromptsList() {
        userPromptsPopupListEl.innerHTML = '';
        userPrompts.forEach(prompt => {
          const listItem = document.createElement('li');
          listItem.classList.add('prompt-item');

          const textSpan = document.createElement('span');
          textSpan.classList.add('prompt-text');
          textSpan.textContent = prompt;
          listItem.onclick = () => insertUserPrompt(prompt); // Insert prompt on click - whole item clickable now

          const deleteButton = document.createElement('button');
          deleteButton.classList.add('prompt-delete-button');
          deleteButton.textContent = '✕';
          deleteButton.onclick = (event) => {
            event.stopPropagation(); // Prevent item click when delete is clicked
            deleteUserPrompt(prompt);
          };

          listItem.appendChild(textSpan);
          listItem.appendChild(deleteButton);
          userPromptsPopupListEl.appendChild(listItem);
        });
      }

      function renderToolPopupList() {
        toolPopupListEl.innerHTML = '';
        availableTools.forEach(toolName => {
          if (!enabledTools.includes(toolName)) { // Only show tools that are not already enabled
            const listItem = document.createElement('li');
            listItem.classList.add('tool-item');
            listItem.textContent = toolName;
            listItem.onclick = () => enableTool(toolName); // Enable tool on click
            toolPopupListEl.appendChild(listItem);
          }
        });
      }


      function toggleSystemPromptsPopup() {
        systemPromptsPopupVisible = !systemPromptsPopupVisible;
        systemPromptsPopupEl.style.display = systemPromptsPopupVisible ? 'block' : 'none';
        if (systemPromptsPopupVisible) {
          renderSystemPromptsList(); // Re-render list every time popup is opened to ensure it's up-to-date
          positionSystemPromptsPopup();
        }
      }

      function toggleUserPromptsPopup() {
        userPromptsPopupVisible = !userPromptsPopupVisible;
        userPromptsPopupEl.style.display = userPromptsPopupVisible ? 'block' : 'none';
        if (userPromptsPopupVisible) {
          renderUserPromptsList(); // Re-render list every time popup is opened to ensure it's up-to-date
          positionUserPromptsPopup();
        }
      }

      function toggleToolPopup() {
        console.log("toggleToolPopup, current state:", toolPopupVisible); // DEBUG
        toolPopupVisible = !toolPopupVisible;
        toolPopupEl.style.display = toolPopupVisible ? 'block' : 'none';
        if (toolPopupVisible) {
          renderToolPopupList();
          positionToolPopup();
        }
      }


      function positionSystemPromptsPopup() {
        const buttonRect = systemPromptLoadButton.getBoundingClientRect();
        systemPromptsPopupEl.style.top = \`\${buttonRect.bottom + window.scrollY}px\`; // Position below the button
        systemPromptsPopupEl.style.right = \`\${window.innerWidth - buttonRect.right}px\`; // Align right edges
      }

      function positionUserPromptsPopup() {
        const buttonRect = userPromptLoadButton.getBoundingClientRect();
        userPromptsPopupEl.style.top = \`\${buttonRect.bottom + window.scrollY}px\`; // Position below the button
        userPromptsPopupEl.style.right = \`\${window.innerWidth - buttonRect.right}px\`; // Align right edges
      }

      function positionToolPopup() {
        const buttonRect = addToolButton.getBoundingClientRect(); // Position relative to "Add Tool" button
        toolPopupEl.style.top = \`\${buttonRect.bottom + window.scrollY}px\`; // Position below the button
        toolPopupEl.style.right = \`\${window.innerWidth - buttonRect.right}px\`; // Align right edges
      }


      function addSystemPromptToLibrary() {
        const prompt = systemPromptEl.value.trim();
        if (prompt) {
          vscode.postMessage({ command: "saveSystemPromptToLibrary", prompt: prompt });
        }
      }

      function addUserPromptToLibrary() {
        const prompt = userInputEl.value.trim();
        if (prompt) {
          vscode.postMessage({ command: "saveUserPromptToLibrary", prompt: prompt });
        }
      }

      function deleteSystemPrompt(prompt) {
        vscode.postMessage({ command: "deleteSystemPromptFromLibrary", prompt: prompt });
      }

      function deleteUserPrompt(prompt) {
        vscode.postMessage({ command: "deleteUserPromptFromLibrary", prompt: prompt });
      }

      function insertSystemPrompt(prompt) {
        systemPromptEl.value = prompt;
        vscode.postMessage({ command: "useSystemPromptFromLibrary", prompt: prompt }); // Send message to update MRU
        toggleSystemPromptsPopup(); // Close popup after inserting
      }

      function insertUserPrompt(prompt) {
        userInputEl.value = prompt;
        vscode.postMessage({ command: "useUserPromptFromLibrary", prompt: prompt }); // Send message to update MRU
        toggleUserPromptsPopup(); // Close popup after inserting
      }

      function enableTool(toolName) {
        if (!enabledTools.includes(toolName)) {
          enabledTools = [...enabledTools, toolName]; // Create a new array
          saveState();
          renderEnabledTools();
          vscode.postMessage({ command: "enableTool", toolName: toolName });
        }
        toggleToolPopup(); // Close tool popup after enabling
      }

      function disableTool(toolName) {
        enabledTools = enabledTools.filter(tool => tool !== toolName);
        saveState();
        renderEnabledTools();
        vscode.postMessage({ command: "disableTool", toolName: toolName });
      }


      // --- Event Listeners ---


      // Restore state and input values on window load
      window.addEventListener("load", () => {
        userInputEl.value = localStorage.getItem(STORAGE_KEYS.userInput) || "";
        // systemPromptEl.value = localStorage.getItem(STORAGE_KEYS.systemPrompt) || ""; // No longer loading systemPrompt from localStorage
        loadState();
        renderChatHistory();
        renderSelectedFiles();
        renderEnabledTools(); // Render enabled tools on load
        renderSystemPromptsList(); // Render system prompts on load
        renderUserPromptsList(); // Render user prompts on load
        vscode.postMessage({ command: "requestSystemPrompts" }); // Request latest prompts from extension - might be redundant now as initPrompts sends them
        vscode.postMessage({ command: "requestUserPrompts" }); // Request latest user prompts from extension - might be redundant now as initPrompts sends them

        document.addEventListener('click', function(event) {
          if (systemPromptsPopupVisible && !systemPromptsPopupEl.contains(event.target) && event.target !== document.getElementById('systemPromptInput') && event.target !== systemPromptLoadButton) {
            toggleSystemPromptsPopup(); // Close system prompt popup if click outside
          }
          if (userPromptsPopupVisible && !userPromptsPopupEl.contains(event.target) && event.target !== document.getElementById('userInput') && event.target !== userPromptLoadButton) {
            toggleUserPromptsPopup(); // Close user prompt popup if click outside
          }
          if (toolPopupVisible && !toolPopupEl.contains(event.target) && event.target !== addToolButton) { // Check click outside tool popup and "Add Tool" button
            toggleToolPopup(); // Close tool popup if click outside
          }
        });
      });

      // Save user input to localStorage on input change
      userInputEl.addEventListener("input", (e) => {
        localStorage.setItem(STORAGE_KEYS.userInput, e.target.value);
        updateUserPrompt(e.target.value); // Update workspace user prompt
      });

      // Update system prompt on input change (debounced)
      systemPromptEl.addEventListener("input", (e) => {
        updateSystemPrompt(e.target.value);
      });

      // Handle messages from the extension
      window.addEventListener("message", (event) => {
        const message = event.data;
        switch (message.command) {
          case "receiveMessage":
            addChatMessage(message.text, message.sender || "assistant");
            resetSendButton();
            break;
          case "updateMessage":
            updateChatMessage(message.messageId, message.text, message.sender, message.messageType);
            resetSendButton();
            break;
          case "logMessage":
            addChatMessage(message.text, "log", message.messageType || 'log'); // Ensure messageType is passed and default to 'log'
            break;
          case "clearMessages":
            clearChatHistory();
            break;
          case "setOpenFiles":
            openFiles = message.files;
            saveState();
            renderSelectedFiles();
            break;
          case "startLoading":
            showLoadingMessage(message.messageId);
            break;
          case "addFilesFromDialog":
            addFiles(message.filePaths);
            break;
          case "systemPromptsList": // Renamed command
            systemPrompts = message.prompts;
            renderSystemPromptsList();
            break;
          case "userPromptsList": // New command
            userPrompts = message.prompts;
            renderUserPromptsList();
            break;
          case "initPrompts": // New case to handle initial prompts and libraries
            currentSystemPrompt = message.systemPrompt || "";
            currentUserPrompt = message.userPrompt || "";
            systemPrompts = message.systemPrompts || [];
            userPrompts = message.userPrompts || [];
            availableTools = message.availableTools || []; // Initialize available tools
            enabledTools = message.enabledTools || []; // Initialize enabled tools
            systemPromptEl.value = currentSystemPrompt;
            userInputEl.value = currentUserPrompt;
            renderSystemPromptsList();
            renderUserPromptsList();
            renderEnabledTools(); // Render enabled tools on init
            break;
          case "updateEnabledTools":
            enabledTools = message.enabledTools;
            renderEnabledTools();
            break;
          default:
            console.warn("Unknown command:", message.command);
        }
      });

      // Expose functions to the global scope.
      window.handleSendMessage = handleSendMessage;
      window.clearChatHistory = clearChatHistory;
      window.addFilesDialog = addFilesDialog;
      window.allowDrop = allowDrop;
      window.dropHandler = dropHandler;
      window.toggleSystemPromptsPopup = toggleSystemPromptsPopup;
      window.toggleUserPromptsPopup = toggleUserPromptsPopup;
      window.toggleToolPopup = toggleToolPopup;
      window.addSystemPromptToLibrary = addSystemPromptToLibrary;
      window.addUserPromptToLibrary = addUserPromptToLibrary;
      window.deleteSystemPrompt = deleteSystemPrompt;
      window.deleteUserPrompt = deleteUserPrompt;
      window.insertSystemPrompt = insertSystemPrompt;
      window.insertUserPrompt = insertUserPrompt;
      window.enableTool = enableTool;
      window.disableTool = disableTool;
    </script>
  </body>
</html>
`;
