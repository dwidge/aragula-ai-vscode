// chatview.ts
export default (tabId: string, systemPrompt: string | undefined) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ask AI</title>
    <style>
      /* Using CSS variables for themes */
      :root {
        --background-color: #f4f4f4;
        --text-color: #000;
        --textarea-background: #fff;
        --textarea-border: #ccc;
        --button-background: #007acc;
        --button-hover: #005fa3;
        --pre-background: #e0e0e0; /* Light background for messages */
        --pre-border: #ccc;
        --user-message-background: #e0f7fa; /* Light blue for user messages */
        --assistant-message-background: #f0f0f0; /* Light grey for assistant messages */
        --system-message-background: #f8e6ff; /* Light purple for system messages */
        --log-message-background: #ffffe0; /* Light yellow for log messages */
      }

      /* Dark theme */
      @media (prefers-color-scheme: dark) {
        :root {
          --background-color: #1e1e1e;
          --text-color: #ccc;
          --textarea-background: #252526;
          --textarea-border: #555;
          --button-background: #007acc;
          --button-hover: #005fa3;
          --pre-background: #252526; /* Dark background for messages */
          --pre-border: #555;
          --user-message-background: #2a3c42; /* Darker blue for user messages */
          --assistant-message-background: #333333; /* Dark grey for assistant messages */
          --system-message-background: #4a2d57; /* Darker purple for system messages */
          --log-message-background: #554d00; /* Darker yellow for log messages */
        }
      }

      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: var(--background-color);
        color: var(--text-color);
      }
      div {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      textarea {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid var(--textarea-border);
        background-color: var(--textarea-background);
        color: var(--text-color);
        resize: vertical;
      }
      button {
        padding: 10px 15px;
        border: none;
        background-color: var(--button-background);
        color: white;
        border-radius: 5px;
        cursor: pointer;
        position: relative;
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
        overflow-x: auto; /* Enable horizontal scrolling for long messages */
      }
      .user-message {
        background-color: var(--user-message-background);
      }
      .assistant-message {
        background-color: var(--assistant-message-background);
      }
      .system-message {
        background-color: var(--system-message-background);
      }
      .log-message {
        background-color: var(--log-message-background);
      }
      .loader {
        display: none;
        width: 20px;
        height: 20px;
        border: 3px solid white;
        border-top: 3px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      .hidden {
        display: none;
      }
      .button-row {
        display: flex;
        flex-direction: row;
        gap: 10px;
        justify-content: flex-start; /* Align buttons to the start */
        align-items: center; /* Vertically align items in the row */
      }
      .button-row button#sendButton {
        flex-grow: 1; /* Allow Send button to take available space */
      }
      .button-row button#clearButton {
        flex-grow: 0; /* Clear button does not grow */
        flex-shrink: 0; /* Prevent Clear button from shrinking */
        background-color: var(--button-background); /* Match send button style */
      }

    </style>
  </head>
  <body>
    <main>
      <div>
        <textarea
          id="systemPromptInput"
          rows="2"
          placeholder="Edit system prompt here..."
        >${systemPrompt || ""}</textarea>
        <textarea
          id="userInput"
          rows="4"
          placeholder="Type your message here..."
        ></textarea>
        <div class="button-row">
          <button
            id="sendButton"
            onclick="sendMessage()"
            aria-label="Send message"
          >
            <span id="buttonText">Send</span>
            <div id="loader" class="loader"></div>
          </button>
          <button
            id="clearButton"
            onclick="clearMessages()"
            aria-label="Clear messages"
          >
            Clear
          </button>
        </div>
      </div>
      <div id="messages-container">
        <!-- Messages will be appended here -->
      </div>
    </main>

    <script>
      const vscode = acquireVsCodeApi();
      const loader = document.getElementById("loader");
      const sendButton = document.getElementById("sendButton");
      const messagesContainer = document.getElementById("messages-container");
      let isBusy = false;
      let userInput = "";
      let systemPrompt = document.getElementById("systemPromptInput").value;
      const tabId = "{{tabId}}"; // Use the passed tabId

      // Debounce function
      function debounce(func, delay) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), delay);
        };
      }

      // Initialize the user input from previous context
      window.addEventListener("load", () => {
        const savedInput = localStorage.getItem('userInput-${tabId}');
        const savedMessages = localStorage.getItem('chatMessages-${tabId}');
        if (savedInput) {
          document.getElementById("userInput").value = savedInput;
          userInput = savedInput;
        }
        if (savedMessages) {
          try {
            const messages = JSON.parse(savedMessages);
            if (Array.isArray(messages)) {
              messages.forEach(msg => appendMessage(msg.text, msg.sender));
            }
          } catch (e) {
            console.error("Failed to parse saved messages:", e);
          }
        }
      });

      function sendMessage() {
        if (isBusy) {
          console.log("Request cancelled.");
          return;
        }
        userInput = document.getElementById("userInput").value.trim();
        systemPrompt = document.getElementById("systemPromptInput").value.trim();
        if (userInput) {
          isBusy = true;
          loader.style.display = "block";
          document.getElementById("buttonText").textContent = "";

          vscode.postMessage({
            command: "sendMessage",
            text: userInput,
            systemPrompt: systemPrompt,
          });

          // Save the current input to localStorage to maintain context
          localStorage.setItem('userInput-${tabId}', userInput);
        } else {
          alert("Please enter a message before sending.");
        }
      }

      function clearMessages() {
        messagesContainer.innerHTML = ''; // Clear all messages from the container
        localStorage.removeItem('chatMessages-${tabId}'); // Clear saved messages from localStorage
      }


      const debouncedSetSystemPrompt = debounce((value) => {
        localStorage.setItem('systemPrompt-${tabId}', value);
        vscode.postMessage({
          command: "setSystemPrompt",
          systemPrompt: value,
        });
      }, 3000);  // Adjust the delay as necessary

      document.getElementById("systemPromptInput").addEventListener("input", (event) => {
        systemPrompt = event.target.value;
        debouncedSetSystemPrompt(systemPrompt);
      });

      function appendMessage(text, sender) {
        const messageElement = document.createElement('pre');
        messageElement.textContent = text;
        messageElement.classList.add('message');
        messageElement.classList.add(\`\${sender}-message\`); // Add sender-specific class

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom

        // Save messages to localStorage
        let chatMessages = localStorage.getItem('chatMessages-${tabId}');
        let messagesArray = chatMessages ? JSON.parse(chatMessages) : [];
        messagesArray.push({ text: text, sender: sender });
        localStorage.setItem('chatMessages-${tabId}', JSON.stringify(messagesArray));
      }


      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message.command === "receiveMessage") {
          appendMessage(message.text, message.sender || 'assistant'); // Default sender to assistant if not provided
          isBusy = false;
          loader.style.display = "none";
          document.getElementById("buttonText").textContent = "Send";
        } else if (message.command === "logMessage") {
          if (message.tabId === tabId) { // Only show logs for the current tab
            appendMessage(message.text, 'log'); // Indicate log message sender
          }
        } else if (message.command === "clearMessages") {
          clearMessages();
        }
      });

      // Save input on change
      document
        .getElementById("userInput")
        .addEventListener("input", (event) => {
          userInput = event.target.value;
          localStorage.setItem('userInput-${tabId}', userInput);
        });
    </script>
  </body>
</html>
`;
