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
        --pre-background: #fff;
        --pre-border: #ccc;
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
          --pre-background: #252526;
          --pre-border: #555;
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
        <button
          id="sendButton"
          onclick="sendMessage()"
          aria-label="Send message"
        >
          <span id="buttonText">Send</span>
          <div id="loader" class="loader"></div>
        </button>
      </div>
      <pre id="response" aria-live="polite"></pre>
    </main>

    <script>
      const vscode = acquireVsCodeApi();
      const loader = document.getElementById("loader");
      const sendButton = document.getElementById("sendButton");
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
        const savedResponse = localStorage.getItem('responseText-${tabId}');
        if (savedInput) {
          document.getElementById("userInput").value = savedInput;
          userInput = savedInput;
        }
        if (savedResponse) {
          document.getElementById("response").textContent = savedResponse;
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

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (message.command === "receiveMessage") {
          const responseDiv = document.getElementById("response");
          responseDiv.textContent = message.text;
          isBusy = false;
          loader.style.display = "none";
          document.getElementById("buttonText").textContent = "Send";
          
          // Save the response to localStorage
          localStorage.setItem('responseText-${tabId}', message.text);
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
