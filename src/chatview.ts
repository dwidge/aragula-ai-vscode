export default (tabId: string, systemPrompt: string | undefined) => `
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
        --log-message-background: #ffffe0;
        --error-message-background: #ffe0b2;
        --loading-message-background: #e8f5e9;
        --file-button-background: #ddd;
        --file-button-hover: #ccc;
        --file-button-remove-hover: #f44336;
        --file-button-text-color: #000;
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
          --log-message-background: #554d00;
          --error-message-background: #572c0f;
          --loading-message-background: #1e3628;
          --file-button-background: #555;
          --file-button-hover: #666;
          --file-button-remove-hover: #e57373;
          --file-button-text-color: #eee;
        }
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: var(--background-color);
        color: var(--text-color);
      }
      #selected-files-container {
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .file-button {
        background-color: var(--file-button-background);
        color: var(--file-button-text-color);
        border: none;
        padding: 5px 10px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.9em;
      }
      .file-button:hover {
        background-color: var(--file-button-hover);
      }
      .file-button .remove-file-button {
        background: none;
        border: none;
        color: var(--file-button-text-color);
        cursor: pointer;
        padding: 0 5px;
        border-radius: 3px;
      }
      .file-button .remove-file-button:hover {
        color: white;
        background-color: var(--file-button-remove-hover);
      }
      .input-area {
        display: flex;
        flex-direction: column;
        gap: 10px;
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
      }
      .message {
        word-wrap: break-word;
      }
      .user-message { background-color: var(--user-message-background); }
      .assistant-message { background-color: var(--assistant-message-background); }
      .system-message { background-color: var(--system-message-background); }
      .log-message { background-color: var(--log-message-background); }
      .error-message { background-color: var(--error-message-background); }
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
    </style>
  </head>
  <body ondragover="allowDrop(event)" ondrop="dropHandler(event)">
    <main>
      <div id="selected-files-container"></div>
      <div class="input-area">
        <textarea id="systemPromptInput" rows="2" placeholder="Edit system prompt here...">${
          systemPrompt || ""
        }</textarea>
        <textarea id="userInput" rows="4" placeholder="Type your message here..."></textarea>
        <div class="button-row">
          <button id="sendButton" onclick="handleSendMessage()">
            <span id="buttonText">Send</span>
            <span id="loader" class="loader" style="display:none;"></span>
          </button>
          <button id="clearButton" onclick="clearChatHistory()">Clear</button>
          <button id="addFilesButton" onclick="addFilesDialog()">Add Files</button>
        </div>
      </div>
      <div id="messages-container"></div>
    </main>
    <script>
      // @ts-ignore
      const vscode = acquireVsCodeApi();
      const tabId = "${tabId}";

      /** @type {string[]} */
      let openFiles = [];

      /** @typedef {Object} ChatMessage
       * @property {string} id
       * @property {string} text
       * @property {string} sender
       * @property {string} [messageType]
       */
      /** @type {ChatMessage[]} */
      let chatHistory = [];

      const STORAGE_KEYS = {
        chatHistory: \`chatMessages-\${tabId}\`,
        userInput: \`userInput-\${tabId}\`,
        systemPrompt: \`systemPrompt-\${tabId}\`,
        openFiles: \`openFiles-\${tabId}\`
      };

      const messagesContainer = document.getElementById("messages-container");
      const userInputEl = document.getElementById("userInput");
      const systemPromptEl = document.getElementById("systemPromptInput");
      const sendButton = document.getElementById("sendButton");
      const buttonText = document.getElementById("buttonText");
      const loader = document.getElementById("loader");
      const selectedFilesContainer = document.getElementById("selected-files-container");

      /** Loads chat history from localStorage. */
      function loadState() {
        const historyData = localStorage.getItem(STORAGE_KEYS.chatHistory);
        try {
          chatHistory = historyData ? JSON.parse(historyData) : [];
        } catch (e) {
          chatHistory = [];
        }
        const filesData = localStorage.getItem(STORAGE_KEYS.openFiles);
        try {
          openFiles = filesData ? JSON.parse(filesData) : [];
        } catch (e) {
          openFiles = [];
        }
      }

      /** Saves chat history to localStorage. */
      function saveState() {
        localStorage.setItem(STORAGE_KEYS.chatHistory, JSON.stringify(chatHistory));
        localStorage.setItem(STORAGE_KEYS.openFiles, JSON.stringify(openFiles));
      }

      /** Renders the entire chat history to the DOM. */
      function renderChatHistory() {
        messagesContainer.innerHTML = "";
        chatHistory.forEach(msg => renderMessage(msg));
        scrollToBottom();
      }

      /** Creates and appends a message element. */
      function renderMessage({ id, text, sender, messageType }) {
        const el = document.createElement('pre');
        el.textContent = text;
        el.classList.add('message', \`\${sender}-message\`);
        if (messageType) el.classList.add(\`\${messageType}-message\`);
        if (id) el.id = \`message-\${id}\`;
        messagesContainer.appendChild(el);
      }

      /** Adds a new message to the chat history and re-renders. */
      function addChatMessage(text, sender, messageType) {
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

      /** Updates an existing chat message and re-renders. */
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

      /** Clears chat history in both memory and localStorage. */
      function clearChatHistory() {
        chatHistory = [];
        localStorage.removeItem(STORAGE_KEYS.chatHistory);
        renderChatHistory();
      }

      /** Scrolls the messages container to the bottom. */
      function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      /** A debounce helper. */
      function debounce(func, delay) {
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), delay);
        };
      }

      // Debounced update for the system prompt.
      const updateSystemPrompt = debounce((value) => {
        localStorage.setItem(STORAGE_KEYS.systemPrompt, value);
        vscode.postMessage({ command: "setSystemPrompt", systemPrompt: value });
      }, 3000);

      // Reset send button UI state.
      function resetSendButton() {
        sendButton.disabled = false;
        loader.style.display = "none";
        buttonText.textContent = "Send";
      }

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

      function removeFile(filePath) {
        openFiles = openFiles.filter(file => file !== filePath);
        saveState();
        renderSelectedFiles();
        vscode.postMessage({ command: "removeFile", filePath: filePath });
      }

      function addFiles(files) {
        const newFiles = files.filter(filePath => !openFiles.includes(filePath));
        openFiles.push(...newFiles);
        saveState();
        renderSelectedFiles();
        vscode.postMessage({ command: "addFiles", filePaths: newFiles });
      }

      function addFilesDialog() {
        vscode.postMessage({ command: "requestAddFiles" });
      }

      function allowDrop(event) {
        event.preventDefault();
        console.log('allowDrop1');
      }

      function dropHandler(event) {
        event.preventDefault();
        console.log('dropHandler1');
        if (event.dataTransfer.items) {
          // Use DataTransferItemList interface to access the file system
          const items = Array.from(event.dataTransfer.items);
          Promise.all(items.map(item => {
            if (item.kind === 'file') {
              const file = item.getAsFile();
              if (file) {
                return file.path; // This might be the full path
              }
            }
            return null;
          }))
          .then(filePaths => {
            const validFilePaths = filePaths.filter(path => path !== null);
            vscode.postMessage({ command: "addFilesFromDialog", filePaths: validFilePaths });
          });
        } else {
          // Use DataTransfer interface to access file URI list
          const files = Array.from(event.dataTransfer.files).map(file => file.path);
          vscode.postMessage({ command: "addFilesFromDialog", filePaths: files });
        }
      }


      // Restore state on load.
      window.addEventListener("load", () => {
        const savedUserInput = localStorage.getItem(STORAGE_KEYS.userInput);
        if (savedUserInput) userInputEl.value = savedUserInput;

        const savedSystemPrompt = localStorage.getItem(STORAGE_KEYS.systemPrompt);
        if (savedSystemPrompt) systemPromptEl.value = savedSystemPrompt;

        loadState();
        renderChatHistory();
        renderSelectedFiles();
      });

      userInputEl.addEventListener("input", (e) => {
        localStorage.setItem(STORAGE_KEYS.userInput, e.target.value);
      });

      systemPromptEl.addEventListener("input", (e) => {
        updateSystemPrompt(e.target.value);
      });

      /** Handles the send button click. */
      function handleSendMessage() {
        if (sendButton.disabled) return;
        const text = userInputEl.value.trim();
        const systemPrompt = systemPromptEl.value.trim();
        if (!text) {
          alert("Please enter a message before sending.");
          return;
        }
        sendButton.disabled = true;
        loader.style.display = "inline-block";
        buttonText.textContent = "";
        const messageId = addChatMessage(text, "user");
        vscode.postMessage({
          command: "sendMessage",
          text,
          systemPrompt,
          messageId
        });
      }

      /** Displays a temporary loading message. */
      function showLoadingMessage(messageId) {
        /** @type ChatMessage */
        const loadingMessage = {
          id: messageId,
          text: "Loading response...",
          sender: "assistant",
          messageType: "loading"
        };
        chatHistory.push(loadingMessage);
        saveState();
        renderChatHistory();
      }

      // Handle messages from the extension.
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
            addChatMessage(message.text, "log");
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
    </script>
  </body>
</html>
`;
