export default `
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
            max-width: 100%; /* Allow it to shrink while keeping responsive */
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
            white-space: pre-wrap; /* Wrapped long lines */
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
            display: none; /* Class to hide elements */
        }
    </style>
</head>
<body>
    <main>
        <div>
            <textarea
                id="userInput"
                rows="4"
                placeholder="Type your message here..."
            ></textarea>
            <button id="sendButton" onclick="sendMessage()" aria-label="Send message">
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
        let isBusy = false; // State to track if the button is busy

        function sendMessage() {
            if (isBusy) {
                // Handle cancel logic if already busy
                console.log('Request cancelled.');
                return; // Exit if already busy
            }
            const userInput = document.getElementById("userInput").value.trim();
            if (userInput) {
                isBusy = true; // Mark as busy
                loader.style.display = "block"; // Show loader
                document.getElementById("buttonText").textContent = ""; // Change button text

                vscode.postMessage({
                    command: "sendMessage",
                    text: userInput,
                });
            } else {
                alert("Please enter a message before sending.");
            }
        }

        window.addEventListener("message", (event) => {
            const message = event.data;
            if (message.command === "receiveMessage") {
                const responseDiv = document.getElementById("response");
                responseDiv.textContent = message.text;
                isBusy = false; // Mark as not busy
                loader.style.display = "none"; // Hide loader
                document.getElementById("buttonText").textContent = "Send"; // Reset button text
            }
        });
    </script>
</body>
</html>
`;
