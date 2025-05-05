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
        --tool-button-hover: var(--tool-button-hover);
        --tool-button-remove-hover: var(--tool-button-remove-hover);
        --tool-button-text-color: var(--tool-button-text-color);
        --provider-button-background: var(--file-button-background);
        --provider-button-hover: var(--provider-button-hover);
        --provider-button-remove-hover: var(--provider-button-remove-hover);
        --provider-button-text-color: var(--provider-button-text-color);
        --form-input-background: var(--textarea-background);
        --form-input-border: var(--textarea-border);
        --form-input-text-color: var(--text-color);
        --plan-step-background: #e0f2f7; /* Light blue */
        --plan-step-completed-background: #c8e6c9; /* Light green */
        --plan-step-executing-background: #fff9c4; /* Light yellow */
        --plan-step-failed-background: #ffcdd2; /* Light red */
        --plan-step-border: #b2ebf2;
        --plan-step-completed-border: #a5d6a7;
        --plan-step-executing-border: #ffe082;
        --plan-step-failed-border: #ef9a9a;
        --plan-step-message-background: #f0f4f6; /* Slightly darker than step background */
        --plan-step-message-border: #cce7ee;
        --progress-bar-background: #ccc;
        --progress-bar-fill: #4CAF50; /* Green */
        --cancel-button-color: #f44336; /* Red */
        --cancel-button-hover-color: #d32f2f; /* Darker red */
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
          --tool-button-hover: var(--tool-button-hover);
          --tool-button-remove-hover: var(--tool-button-remove-hover);
          --tool-button-text-color: var(--tool-button-text-color);
          --provider-button-background: var(--file-button-background);
          --provider-button-hover: var(--provider-button-hover);
          --provider-button-remove-hover: var(--provider-button-remove-hover);
          --provider-button-text-color: var(--provider-button-text-color);
          --form-input-background: var(--textarea-background);
          --form-input-border: var(--textarea-border);
          --form-input-text-color: var(--text-color);
          --plan-step-background: #263238; /* Dark blue-grey */
          --plan-step-completed-background: #33691e; /* Dark green */
          --plan-step-executing-background: #f57f17; /* Dark yellow */
          --plan-step-failed-background: #b71c1c; /* Dark red */
          --plan-step-border: #37474f;
          --plan-step-completed-border: #558b2f;
          --plan-step-executing-border: #fbc02d;
          --plan-step-failed-border: #c62828;
          --plan-step-message-background: #37474f; /* Darker blue-grey */
          --plan-step-message-border: #455a64;
          --progress-bar-background: #555;
          --progress-bar-fill: #4CAF50; /* Green */
          --cancel-button-color: #e57373; /* Light red */
          --cancel-button-hover-color: #ef9a9a; /* Lighter red */
        }
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: var(--background-color);
        color: var(--text-color);
      }
      #selected-files-container, #enabled-tools-container, #selected-provider-container {
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .file-button, .tool-button, .provider-button {
        background-color: var(--provider-button-background);
        color: var(--provider-button-text-color);
        border: none;
        padding: 5px 10px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.9em;
      }
      .file-button:hover, .tool-button:hover, .provider-button:hover {
        background-color: var(--provider-button-hover);
      }
      .file-button .remove-file-button, .tool-button .remove-tool-button, .provider-button .remove-provider-button {
        background: none;
        border: none;
        color: var(--provider-button-text-color);
        cursor: pointer;
        padding: 0 5px;
        border-radius: 3px;
        font-size: 1em; /* Increased for better visibility */
        line-height: 1; /* Adjust line-height to vertically center */
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px; /* Fixed width for the button */
        height: 18px; /* Fixed height for the button */
      }


      .file-button .remove-file-button:hover, .tool-button .remove-tool-button:hover, .provider-button .remove-provider-button:hover {
        color: white;
        background-color: var(--provider-button-remove-hover);
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
      textarea, .form-input, select {
        box-sizing: border-box;
        width: 100%;
        padding: 10px;
        border-radius: 5px;
        border: 1px solid var(--form-input-border);
        background-color: var(--form-input-background);
        color: var(--form-input-text-color);
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
        flex-wrap: wrap; /* Allow buttons to wrap */
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
        border-radius: 5px;
        border: 1px solid var(--pre-border);
        white-space: pre-wrap;
        color: var(--text-color);
        overflow-x: auto;
        position: relative;
        display: flex; /* Enable flex layout for badge and collapse button alignment */
        flex-direction: column; /* Stack progress bar, then content wrapper */
      }

      /* Wrapper for content below the progress bar */
      .message-content-wrapper {
          padding: 8px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 8px;
      }

      .message-header {
        display: grid; /* Changed to grid layout */
        grid-template-columns: 1fr auto auto auto; /* Layout with 4 columns: Preview | Badge | Cancel | Collapse */
        align-items: start; /* Align items to start */
        cursor: pointer; /* Make entire header clickable */
        position: relative; /* needed for absolute positioning of busy/cancel */
      }
      .message-header.non-collapsible {
          cursor: default; /* Change cursor for non-collapsible messages */
      }
      .message-preview {
        overflow: hidden; /* Hide overflowing text */
        text-overflow: ellipsis; /* Ellipsis for overflow */
        white-space: nowrap; /* Prevent text wrapping */
        margin-right: 10px; /* Add some spacing to the right */
      }
      /* Hide message preview when expanded */
      .message-type-badge {
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 0.7em;
        background-color: rgba(0, 0, 0, 0.2);
        color: white;
        margin-left: auto; /* Push badge to the right */
      }
      .collapse-button, .cancel-button {
        background: none;
        border: none;
        color: var(--text-color);
        cursor: pointer;
        font-size: 0.8em;
        opacity: 0.5; /* Reduced opacity for less emphasis */
        padding: 0 5px; /* Added padding for better click area */
        margin-left: 5px; /* Gap between badge/cancel and button */
      }
      .cancel-button {
          color: var(--cancel-button-color);
      }
      .collapse-button:hover, .cancel-button:hover {
        opacity: 1; /* Full opacity on hover */
      }
      .cancel-button:hover {
          color: var(--cancel-button-hover-color);
      }

      .message {
        word-wrap: break-word;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* New wrapper for detail text and child messages, below the header */
      .message-body-content {
        padding-top: 8px; /* Space above content */
        border-top: 1px dashed var(--pre-border); /* The dotted line */
      }

      .collapsible-content {
        overflow: hidden;
        transition: max-height 0.3s ease-out;
      }
      .collapsible-content.collapsed {
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        margin-bottom: 0;
        overflow: hidden; /* Ensure hidden content doesn't cause scroll */
      }

      /* Container for main chat messages */
      #messages-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
      }


      .user-message { background-color: var(--user-message-background); }
      .assistant-message { background-color: var(--assistant-message-background); }
      .system-message { background-color: var(--system-message-background); }
      .prompt-message { background-color: var(--prompt-message-background); }
      .tool-message { background-color: var(--prompt-message-background); } /* Style for tool messages */
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
        line-height: 1;
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .prompt-delete-button:hover {
        color: white;
        background-color: var(--prompt-delete-button-hover);
      }
      .prompt-text { flex-grow: 1; margin-right: 10px;  word-wrap: break-word; /* Ensure text wrapping in text span too */}

      .prompt-popup, .tool-popup, .provider-popup {
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
      .prompt-popup .prompts-list, .tool-popup .tool-list, .provider-popup .provider-list {
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
      .provider-popup .provider-list .provider-item {
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
      .provider-popup .provider-list .provider-item:last-child { border-bottom: none; }
      .provider-popup .provider-list .provider-item:hover { background-color: var(--prompt-item-hover); }

      .provider-popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .provider-popup-header button {
        display: none; /* Hide the add button in header */
      }
      .provider-form {
        display: flex; /* Always visible now */
        flex-direction: column;
        gap: 10px;
        margin-top: 10px;
      }
      .provider-form label {
        margin-bottom: 5px;
        font-weight: bold;
      }
      .provider-form input {
        margin-bottom: 0; /* Reduced bottom margin */
        padding: 8px;
        border-radius: 5px;
        border: 1px solid var(--form-input-border);
        background-color: var(--form-input-background);
        color: var(--form-input-text-color);
      }
      .provider-form select {
        margin-bottom: 0; /* Reduced bottom margin */
        padding: 8px;
        border-radius: 5px;
        border: 1px solid var(--form-input-border);
        background-color: var(--form-input-background);
        color: var(--form-input-text-color);
        appearance: none; /* Remove default arrow in some browsers */
        -webkit-appearance: none; /* For Safari */
        background-image: url('data:image/svg+xml;utf8,<svg fill="black" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="0 0h24v24H0z" fill="none"/></svg>');
        background-repeat: no-repeat;
        background-position-x: 100%;
        background-position-y: 5px; /* Adjust as needed for vertical alignment */
        padding-right: 30px; /* Space for the arrow */
      }
      @media (prefers-color-scheme: dark) {
        .provider-form select {
          background-image: url('data:image/svg+xml;utf8,<svg fill="white" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="0 0h24v24H0z" fill="none"/></svg>');
        }
      }


      .provider-form-buttons {
        display: flex; /* Always visible now */
        gap: 10px;
        justify-content: flex-end;
        margin-top: 10px;
      }
      .error-message-inline {
        color: red;
        font-size: 0.8em;
        margin-top: 2px;
        display: none; /* Initially hidden */
      }
      .select-provider-button, .duplicate-provider-button {
        background: none;
        border: none;
        color: var(--file-button-text-color);
        cursor: pointer;
        padding: 0 5px;
        border-radius: 3px;
        font-size: 0.8em;
        line-height: 1;
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .select-provider-button:hover, .duplicate-provider-button:hover {
        color: white;
        background-color: var(--button-background); /* Or a more suitable color */
      }

      .auto-checkbox {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.9em;
      }
      .auto-checkbox input[type="checkbox"] {
        margin: 0;
      }

      /* Plan UI Styles */
      #plan-container {
        margin-top: 20px;
        padding: 10px;
        border: 1px solid var(--pre-border);
        border-radius: 5px;
        background-color: var(--pre-background);
        display: none; /* Hidden by default */
      }
      #plan-container h3 {
        margin-top: 0;
        margin-bottom: 10px;
        border-bottom: 1px solid var(--pre-border);
        padding-bottom: 5px;
      }
      .plan-step {
        padding: 10px;
        margin-bottom: 8px;
        border-radius: 5px;
        border: 1px solid var(--plan-step-border);
        background-color: var(--plan-step-background);
        display: flex;
        flex-direction: column; /* Stack header and content */
      }
      .plan-step-header {
        display: grid; /* Use grid for status, preview, button */
        grid-template-columns: auto 1fr auto; /* Status | Preview | Button */
        align-items: center;
        gap: 10px;
        cursor: pointer;
      }
      .plan-step-status {
        font-size: 1.2em;
        min-width: 20px; /* Ensure consistent spacing */
        text-align: center;
      }
      .plan-step-preview {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .plan-step-content {
        overflow: hidden;
        transition: max-height 0.3s ease-out;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .plan-step-content.collapsed {
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        margin-bottom: 0;
        overflow: hidden;
      }
      .plan-step-content p {
          margin-top: 0;
          margin-bottom: 5px;
          font-weight: bold;
      }
      .plan-step-content pre {
          margin-top: 0;
          padding: 8px; /* Slightly less padding than main pre */
      }
      /* Hide full description inside content when collapsed */
      .plan-step:has(.plan-step-content.collapsed) .plan-step-content strong {
          display: none;
      }

      .plan-step.completed {
        background-color: var(--plan-step-completed-background);
        border-color: var(--plan-step-completed-border);
      }
      .plan-step.executing {
        background-color: var(--plan-step-executing-background);
        border-color: var(--plan-step-executing-border);
      }
       .plan-step.failed {
        background-color: var(--plan-step-failed-background);
        border-color: var(--plan-step-failed-border);
      }
      #plan-controls {
        margin-top: 10px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
      }
      #plan-error {
        color: red;
        margin-top: 10px;
        font-weight: bold;
        display: none;
      }

      /* Styles for messages within plan steps */
      .step-messages-container {
          padding-top: 8px;
          border-top: 1px dashed var(--pre-border); /* Separator */
          display: flex;
          flex-direction: column;
          gap: 8px;
      }
      .step-messages-container .message {
          background-color: var(--plan-step-message-background); /* Different background */
          border: 1px solid var(--plan-step-message-border); /* Different border */
          display: flex;
          flex-direction: column;
          gap: 8px;
      }
       .step-messages-container .message .message-content-wrapper {
           padding: 8px; /* Apply padding inside the wrapper */
       }
      .step-messages-container .message:last-child {
      }
      .step-messages-container .message .message-header {
      }
      .step-messages-container .message .message-type-badge {
      }
      .step-messages-container .message .collapse-button {
      }

      /* Styles for nested task logs (outside of plan steps) */
      .child-messages-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
      }
      .child-messages-container .message {
          border: 1px solid var(--plan-step-message-border);
          display: flex;
          flex-direction: column;
          gap: 8px;
      }
      .child-messages-container .message .message-content-wrapper {
          padding: 8px; /* Apply padding inside the wrapper */
      }
      .child-messages-container .message:last-child {
      }
      .child-messages-container .message .message-header {
      }
      .child-messages-container .message .message-type-badge {
      }
      .child-messages-container .message .collapse-button {
      }

      /* Styles for Task Logger Progress Bar */
      .progress-bar-container {
          width: 100%;
          height: 5px; /* Height of the progress bar */
          background-color: var(--progress-bar-background);
          /* border-radius: 2.5px; /* Half of height for rounded ends */ /* Removed for top border look */
          overflow: hidden; /* Hide overflow of the fill */
          margin-top: 0; /* Position at the very top */
          margin-bottom: 0; /* No margin below, padding is in the wrapper */
          border-top-left-radius: 5px; /* Match pre border radius */
          border-top-right-radius: 5px; /* Match pre border radius */
      }

      .progress-bar-fill {
          height: 100%;
          background-color: var(--progress-bar-fill);
          width: 0%; /* Initial width */
          transition: width 0.3s ease-in-out; /* Smooth transition */
      }

      /* Optional: Style for failed progress */
      .progress-bar-container.failed .progress-bar-fill {
          background-color: #f44336; /* Red color for failed */
      }
      /* Optional: Style for completed progress */
      .progress-bar-container.completed .progress-bar-fill {
          background-color: #4CAF50; /* Green color for completed */
      }
      /* Optional: Style for busy progress */
      .progress-bar-container.busy .progress-bar-fill {
          background-color: #ffeb3b; /* Yellow color for busy */
      }
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

      <div id="selected-provider-container">
      </div>
      <div id="provider-popup" class="provider-popup">
        <div class="provider-popup-header">
          <span>Providers</span>
          <div>
            <button style="display:none;" onclick="handleAddProviderButton()">Add</button> <!-- Hiding header add button -->
          </div>
        </div>
        <ul id="provider-popup-list" class="provider-list"></ul>

        <div id="provider-form" class="provider-form">
          <h3>Add/Edit Provider</h3>
          <label for="provider-name">Name:</label>
          <input type="text" id="provider-name" class="form-input" placeholder="Provider Name" />
          <div class="error-message-inline" id="provider-name-error"></div>

          <label for="provider-vendor">Vendor:</label>
          <select id="provider-vendor" class="form-input">
            <option value="">Select Vendor</option>
          </select>
          <div class="error-message-inline" id="provider-vendor-error"></div>

          <label for="provider-apiKey">API Key:</label>
          <input type="text" id="provider-apiKey" class="form-input" placeholder="API Key" />
          <div class="error-message-inline" id="provider-apiKey-error"></div>

          <label for="provider-baseURL">Base URL (optional):</label>
          <input type="text" id="provider-baseURL" class="form-input" placeholder="Base URL (for custom servers)" />
          <div class="error-message-inline" id="provider-baseURL-error"></div>

          <label for="provider-model">Model:</label>
          <input type="text" id="provider-model" class="form-input" placeholder="Model Name (e.g., gpt-4, claude-v1.3)" />
          <div class="error-message-inline" id="provider-model-error"></div>

          <label for="provider-maxTokens">Max Tokens (optional):</label>
          <input type="number" id="provider-maxTokens" class="form-input" placeholder="Max Tokens" />
          <div class="error-message-inline" id="provider-maxTokens-error"></div>

          <label for="provider-temperature">Temperature (optional, 0-2):</label>
          <input type="number" id="provider-temperature" class="form-input" placeholder="Temperature (e.g., 0.7)" step="0.1" min="0" max="2" />
          <div class="error-message-inline" id="provider-temperature-error"></div>

          <div class="provider-form-buttons">
            <button onclick="handleSaveProviderSettings()">Save</button>
            <button onclick="handleCancelProviderSettings()">Cancel</button>
          </div>
        </div>
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
          <button id="planButton" onclick="handlePlanAndExecute()">
             <span id="planButtonText">Plan & Execute</span>
             <span id="planLoader" class="loader" style="display:none;"></span>
          </button>
          <button id="clearButton" onclick="clearChatHistory()">Clear</button>
          <button id="addFilesButton" onclick="addFilesDialog()">Add Files</button>
          <button id="addToolButton" onclick="toggleToolPopup()">Add Tool</button>
          <button id="providerSettingsButton" onclick="toggleProviderSettingsPopup()">Providers</button>
          <div class="auto-checkbox">
            <input type="checkbox" id="autoRemoveCommentsCheckbox">
            <label for="autoRemoveCommentsCheckbox">Auto Remove Comments</label>
          </div>
          <button id="removeCommentsButton" onclick="handleRemoveComments()">Remove Comments</button>
          <div class="auto-checkbox">
            <input type="checkbox" id="autoFormatCheckbox">
            <label for="autoFormatCheckbox">Auto Format</label>
          </div>
          <button id="formatButton" onclick="handleFormat()">Format</button>
          <div class="auto-checkbox">
            <input type="checkbox" id="autoFixErrorsCheckbox">
            <label for="autoFixErrorsCheckbox">Auto Fix Errors</label>
          </div>
          <button id="fixErrorsButton" onclick="handleFixErrors()">Fix Errors</button>
          <button id="commitFilesButton" onclick="handleCommitFiles()">Commit Files</button> <!-- New Commit Files Button -->
          <button id="testTaskButton" onclick="handleTestTask()">Test Task Logger</button> <!-- New Test Task Logger Button -->
          <button id="testMultiTaskButton" onclick="handleTestMultiTask()">Test Multi Task</button> <!-- New Test Multi Task Button -->
          <button id="testSerialTaskButton" onclick="handleTestSerialTask()">Test Serial Task</button> <!-- New Test Serial Task Button -->
        </div>
      </div>

      <div id="plan-container">
        <h3 id="plan-goal">AI Plan:</h3>
        <div id="plan-steps">
          <!-- Plan steps will be rendered here -->
        </div>
        <div id="plan-error"></div>
        <div id="plan-controls">
          <!-- Plan control buttons will be rendered here -->
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
      let systemPrompts = []; // Will be updated by message
      /** @type {string[]} */
      let userPrompts = []; // Will be updated by message
      /** @type {string[]} */
      let availableTools = []; // Will be updated by message on init
      /** @type {string[]} */
      let enabledTools = []; // Will be updated by message on init and user actions
      /** @type {Array<AiProviderSettings>} */
      let providerSettingsList = []; // Will be updated by message on init
      /** @type {AiProviderSettings | undefined} */
      let currentProviderSetting = undefined; // Will be updated by message on init
      /** @type {string[]} */
      let availableVendors = []; // Will be updated by message on init
      let systemPromptsPopupVisible = false;
      let userPromptsPopupVisible = false;
      let toolPopupVisible = false;
      let providerSettingsPopupVisible = false;
      let editingProviderName = null; // Track which provider is being edited
      /** @type {string} */
      let currentSystemPrompt = ""; // Placeholder, will be initialized by message
      /** @type {string} */
      let currentUserPrompt = ""; // Placeholder, will be initialized by message
      let providerFormChanged = false; // Flag to track if provider form has changed since last save/load
      /** @type {boolean} */
      let autoRemoveComments = true; // Will be initialized by message
      /** @type {boolean} */
      let autoFormat = true; // Will be initialized by message
      /** @type {boolean} */
      let autoFixErrors = true; // Will be initialized by message

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
        status: 'idle',
        currentStepIndex: -1,
        plan: null,
        error: null,
        filePaths: [],
        providerSetting: null,
        autoRemoveComments: true,
        autoFormat: true,
        autoFixErrors: true,
        stepCollapsedStates: [], // Initialize collapse states
        tabId: tabId // Initialize tabId
      };


      const STORAGE_KEYS = {
        chatHistory: \`chatMessages-\${tabId}\`,
        userInput: \`userInput-\${tabId}\`,
        openFiles: \`openFiles-\${tabId}\`,
        enabledTools: 'enabledTools', // Key for enabled tools (Global)
        currentProviderSettingName: 'currentProviderSettingName', // Key for current provider setting name (Global)
        autoRemoveComments: \`autoRemoveComments-\${tabId}\`, // Key for auto remove comments checkbox state (Workspace)
        autoFormat: \`autoFormat-\${tabId}\`, // Key for auto format checkbox state (Workspace)
        autoFixErrors: \`autoFixErrors-\${tabId}\`, // Key for auto fix errors checkbox state (Workspace)
        planState: \`planState-\${tabId}\`, // Key for plan state (Workspace)
      };

      // DOM elements
      const messagesContainer = document.getElementById("messages-container");
      const userInputEl = document.getElementById("userInput");
      const systemPromptEl = document.getElementById("systemPromptInput");
      const sendButton = document.getElementById("sendButton");
      const buttonText = document.getElementById("buttonText");
      const loader = document.getElementById("loader");
      const planButton = document.getElementById("planButton"); // New plan button
      const planButtonText = document.getElementById("planButtonText"); // Text span for plan button
      const planLoader = document.getElementById("planLoader"); // Loader for plan button
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
      const selectedProviderContainer = document.getElementById("selected-provider-container");
      const providerSettingsPopupEl = document.getElementById("provider-popup");
      const providerSettingsPopupListEl = document.getElementById("provider-popup-list");
      const providerSettingsButton = document.getElementById("providerSettingsButton");
      const providerFormEl = document.getElementById('provider-form');
      const providerNameInput = document.getElementById('provider-name');
      const providerVendorInput = document.getElementById('provider-vendor');
      const providerApiKeyInput = document.getElementById('provider-apiKey');
      const providerBaseURLInput = document.getElementById('provider-baseURL');
      const providerModelInput = document.getElementById('provider-model');
      const providerMaxTokensInput = document.getElementById('provider-maxTokens');
      const providerTemperatureInput = document.getElementById('provider-temperature'); // New input for temperature
      const providerNameError = document.getElementById('provider-name-error');
      const providerVendorError = document.getElementById('provider-vendor-error');
      const providerApiKeyError = document.getElementById('provider-apiKey-error');
      const providerModelError = document.getElementById('provider-model-error');
      const providerTemperatureError = document.getElementById('provider-temperature-error'); // New error for temperature
      const removeCommentsButton = document.getElementById('removeCommentsButton');
      const formatButton = document.getElementById('formatButton');
      const fixErrorsButton = document.getElementById('fixErrorsButton'); // New button for fix errors
      const autoRemoveCommentsCheckbox = document.getElementById('autoRemoveCommentsCheckbox');
      const autoFormatCheckbox = document.getElementById('autoFormatCheckbox');
      const autoFixErrorsCheckbox = document.getElementById('autoFixErrorsCheckbox'); // New checkbox for auto fix errors
      const commitFilesButton = document.getElementById('commitFilesButton'); // New Commit Files Button
      const testTaskButton = document.getElementById('testTaskButton'); // New Test Task Logger Button
      const testMultiTaskButton = document.getElementById('testMultiTaskButton'); // New Test Multi Task Button
      const testSerialTaskButton = document.getElementById('testSerialTaskButton'); // New Test Serial Task Button


      // Plan UI elements
      const planContainer = document.getElementById('plan-container');
      const planGoalEl = document.getElementById('plan-goal');
      const planStepsEl = document.getElementById('plan-steps');
      const planErrorEl = document.getElementById('plan-error');
      const planControlsEl = document.getElementById('plan-controls');


      /**
       * @typedef {Object} AiProviderSettings
       * @property {string} name
       * @property {string} vendor
       * @property {string} apiKey
       * @property {string} [baseURL]
       * @property {string} model
       * @property {number} [max_tokens]
       * @property {number} [temperature]
       */


      /**
       * Loads state from localStorage: chat history, open files.
       * Note: Plan state, prompts, auto settings, enabled tools, current provider
       * are loaded from workspaceState/globalState via initPrompts message.
       */
      function loadState() {
        chatHistory = loadFromLocalStorage(STORAGE_KEYS.chatHistory, []);
        openFiles = loadFromLocalStorage(STORAGE_KEYS.openFiles, []);
        // enabledTools and currentProviderSetting are now primarily managed by globalState in extension.ts
        // and sent via initPrompts/sendEnabledTools/sendCurrentProviderSetting messages.
        // We keep localStorage for backward compatibility or if globalState isn't available immediately.
        // enabledTools = loadFromLocalStorage(STORAGE_KEYS.enabledTools, []); // Removed - rely on extension state
        // const currentProviderSettingName = localStorage.getItem(STORAGE_KEYS.currentProviderSettingName); // Removed - rely on extension state
        // if (currentProviderSettingName && providerSettingsList.length > 0) {
        //   currentProviderSetting = providerSettingsList.find(p => p.name === currentProviderSettingName);
        // } else if (providerSettingsList.length > 0) {
        //   currentProviderSetting = providerSettingsList[0]; // Default to first if available and none selected
        // }

        // Checkbox states are loaded from workspaceState via initPrompts message.
        // The initial state from initPrompts will set the checkbox values.
        // We don't load them from localStorage here anymore to avoid conflicts.
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
       * Saves state to localStorage: chat history, open files.
       * Checkbox states, plan state, enabled tools, current provider are saved to workspaceState/globalState via extension messages.
       */
      function saveState() {
        saveToLocalStorage(STORAGE_KEYS.chatHistory, chatHistory);
        saveToLocalStorage(STORAGE_KEYS.openFiles, openFiles);
        // saveToLocalStorage(STORAGE_KEYS.enabledTools, enabledTools); // Removed - rely on extension state
        // if (currentProviderSetting) { // Removed - rely on extension state
        //   localStorage.setItem(STORAGE_KEYS.currentProviderSettingName, currentProviderSetting.name);
        // }
        // Checkbox states and plan state are saved via messages to extension
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
        chatHistory.forEach(msg => {
            // Use stored summary and detail
            renderMessage({
                id: msg.id,
                type: msg.messageType,
                summary: msg.summary, // Use stored summary
                detail: msg.detail,   // Use stored detail
                isCollapsed: msg.isCollapsed
            }); // renderMessage defaults to messagesContainer
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
       * @param {HTMLElement} [targetContainer=messagesContainer] - The container to append the message to.
       */
      function renderMessage({ id, type = 'log', summary, detail, progress, isCollapsed = false }, targetContainer = messagesContainer) {
          const el = document.createElement('pre');
          el.classList.add('message');
          el.classList.add(\`\${type}-message\`);
          if (['prompt', 'tool'].includes(type)) {
            el.classList.add('tool-message');
          }
          if (id) el.id = \`message-\${id}\`; // Add ID to the message element

          // Add Progress Bar if progress is defined
          if (progress !== undefined) {
              const progressBarContainer = document.createElement('div');
              progressBarContainer.classList.add('progress-bar-container');
              const progressBarFill = document.createElement('div');
              progressBarFill.classList.add('progress-bar-fill');
              const width = Math.max(0, Math.min(1, progress)) * 100;
              progressBarFill.style.width = \`\${width}%\`;
               if (progress < 0) {
                   progressBarContainer.classList.add('failed');
               } else if (progress === 1) {
                   progressBarContainer.classList.add('completed');
               } else if (progress > 0 && progress < 1) {
                   progressBarContainer.classList.add('busy');
               }
              progressBarContainer.appendChild(progressBarFill);
              el.appendChild(progressBarContainer); // Append progress bar first, inside the message element
          }

          // Create a wrapper for the content below the progress bar
          const messageContentWrapper = document.createElement('div');
          messageContentWrapper.classList.add('message-content-wrapper');

          const headerDiv = document.createElement('div');
          headerDiv.classList.add('message-header');

          const previewSpan = document.createElement('span');
          previewSpan.classList.add('message-preview');
          // Use provided summary for preview
          previewSpan.textContent = summary !== undefined ? summary : '';
          headerDiv.appendChild(previewSpan);

          const badge = document.createElement('span');
          badge.classList.add('message-type-badge');
          badge.textContent = type;
          headerDiv.appendChild(badge);

          // Add Cancel Button (initially hidden)
          const cancelButton = document.createElement('button');
          cancelButton.classList.add('cancel-button');
          cancelButton.textContent = '✕'; // Cross icon
          cancelButton.title = 'Cancel Task';
          cancelButton.style.display = 'none'; // Hidden by default
          cancelButton.onclick = (event) => {
              event.stopPropagation(); // Prevent header click
              handleCancelTask(id); // Call cancel handler with message ID
          };
          headerDiv.appendChild(cancelButton);


          const collapseButton = document.createElement('button');
          collapseButton.classList.add('collapse-button');
          collapseButton.textContent = isCollapsed ? '▼' : '▲';
          headerDiv.appendChild(collapseButton);

          messageContentWrapper.appendChild(headerDiv); // Append header to the wrapper


          const contentDiv = document.createElement('div');
          contentDiv.classList.add('collapsible-content');
          contentDiv.classList.toggle('collapsed', isCollapsed); // Set initial collapsed state

          // Create wrapper for detail text and child messages, below the header
          const messageBodyContentDiv = document.createElement('div');
          messageBodyContentDiv.classList.add('message-body-content');

          // Create wrapper for detail text
          const messageDetailTextDiv = document.createElement('div');
          messageDetailTextDiv.classList.add('message-detail-text');
          messageDetailTextDiv.textContent = detail || ''; // Use provided detail for content
          messageBodyContentDiv.appendChild(messageDetailTextDiv); // Append detail text wrapper

          // Add container for child messages (hidden by default)
          const childMessagesContainer = document.createElement('div');
          childMessagesContainer.classList.add('child-messages-container');
          childMessagesContainer.style.display = isCollapsed ? 'none' : ''; // Hide child container if collapsed
          messageBodyContentDiv.appendChild(childMessagesContainer); // Append child container

          contentDiv.appendChild(messageBodyContentDiv); // Append the body content wrapper to collapsible content
          messageContentWrapper.appendChild(contentDiv); // Append collapsible content to the wrapper

          el.appendChild(messageContentWrapper); // Append the wrapper to the message element

          // Update collapsibility based on initial content
          updateMessageCollapsibility(el);
          // Update cancel button visibility based on initial state
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
       * @param {HTMLElement} [container=messagesContainer] - The container where the message is rendered.
       */
      function updateMessageElement(id, { type, summary, detail, progress }, container = messagesContainer) {
          const el = container.querySelector(\`#message-\${id}\`); // Find element within the specified container
          if (!el) return;

          const contentDiv = el.querySelector('.collapsible-content');
          const previewSpan = el.querySelector('.message-preview');
          const badge = el.querySelector('.message-type-badge');
          const messageDetailTextDiv = el.querySelector('.message-detail-text'); // Get the detail text wrapper
          let progressBarContainer = el.querySelector('.progress-bar-container');
          let progressBarFill = el.querySelector('.progress-bar-fill');
          const childMessagesContainer = el.querySelector('.child-messages-container'); // Get child container
          const currentType = el.classList.contains('user-message') ? 'user' : el.classList.contains('assistant-message') ? 'assistant' : el.classList.contains('system-message') ? 'system' : el.classList.contains('prompt-message') ? 'prompt' : el.classList.contains('tool-message') ? 'tool' : el.classList.contains('log-message') ? 'log' : el.classList.contains('error-message') ? 'error' : el.classList.contains('warning-message') ? 'warning' : el.classList.contains('info-message') ? 'info' : el.classList.contains('loading-message') ? 'loading' : 'log';


          if (summary !== undefined && previewSpan) {
               previewSpan.textContent = summary; // Use provided summary
          }

          if (detail !== undefined && messageDetailTextDiv) {
              messageDetailTextDiv.textContent = detail; // Update detail text
              // Re-evaluate collapsibility after detail update
              updateMessageCollapsibility(el);
          }
          if (type !== undefined && badge) {
              badge.textContent = type;
              // Update classes for styling
              el.classList.remove('user-message', 'assistant-message', 'system-message', 'prompt-message', 'tool-message', 'log-message', 'error-message', 'warning-message', 'info-message', 'loading-message');
              el.classList.add(\`\${type}-message\`);
               if (['prompt', 'tool'].includes(type)) {
                  el.classList.add('tool-message');
              }
          }

          // Update Progress Bar if progress is defined
          if (progress !== undefined) {
              if (!progressBarContainer) {
                   // Create progress bar if it doesn't exist
                   progressBarContainer = document.createElement('div');
                   progressBarContainer.classList.add('progress-bar-container');
                   progressBarFill = document.createElement('div');
                   progressBarFill.classList.add('progress-bar-fill');
                   progressBarContainer.appendChild(progressBarFill);
                   // Insert the progress bar container before the content wrapper
                   const messageContentWrapper = el.querySelector('.message-content-wrapper');
                   if (messageContentWrapper) {
                       messageContentWrapper.before(progressBarContainer);
                   } else {
                       el.prepend(progressBarContainer); // Fallback
                   }
              } else {
                   // Ensure it's visible if it was hidden by collapse
                   progressBarContainer.style.display = '';
              }

              const width = Math.max(0, Math.min(1, progress)) * 100;
              progressBarFill.style.width = \`\${width}%\`;

              progressBarContainer.classList.remove('failed', 'completed', 'busy');
              if (progress < 0) {
                   progressBarContainer.classList.add('failed');
              } else if (progress === 1) {
                   progressBarContainer.classList.add('completed');
              } else if (progress > 0 && progress < 1) {
                   progressBarContainer.classList.add('busy');
              }
          } else if (progressBarContainer) {
               // If progress is undefined but bar exists, hide it.
               progressBarContainer.style.display = 'none';
          }

          // Update cancel button visibility based on updated state
          updateCancelButtonVisibility(el, type || currentType, progress);

          // Collapse state is handled by toggleMessageCollapse
      }

      /**
       * Updates the collapsibility state of a message element based on its content.
       * Hides/shows the collapse button and sets the non-collapsible class on the header.
       * @param {HTMLElement} messageEl - The message element (<pre>) to update.
       */
      function updateMessageCollapsibility(messageEl) {
          if (!messageEl) return;

          const headerDiv = messageEl.querySelector('.message-header');
          const contentDiv = messageEl.querySelector('.collapsible-content');
          const collapseButton = messageEl.querySelector('.collapse-button');
          const detailTextDiv = messageEl.querySelector('.message-detail-text');
          const childMessagesContainer = messageEl.querySelector('.child-messages-container');

          const hasDetailText = detailTextDiv && detailTextDiv.textContent.trim() !== '';
          const hasChildMessages = childMessagesContainer && childMessagesContainer.children.length > 0;
          const isCollapsible = hasDetailText || hasChildMessages;

          if (isCollapsible) {
              headerDiv.classList.remove('non-collapsible');
              if (collapseButton) collapseButton.style.display = ''; // Show button
          } else {
              headerDiv.classList.add('non-collapsible');
              if (collapseButton) collapseButton.style.display = 'none'; // Hide button
              // Ensure content is collapsed if it becomes non-collapsible
              if (contentDiv) contentDiv.classList.add('collapsed');
              if (childMessagesContainer) childMessagesContainer.style.display = 'none';
          }
      }

      /**
       * Updates the visibility of the cancel button based on message type and progress.
       * @param {HTMLElement} messageEl - The message element (<pre>) to update.
       * @param {string} type - The message type. // Keep type parameter for context, but don't use it for visibility check
       * @param {number} [progress] - The progress value.
       */
      function updateCancelButtonVisibility(messageEl, type, progress) { // Keep type parameter
          if (!messageEl) return;
          const cancelButton = messageEl.querySelector('.cancel-button');
          if (cancelButton) {
              // Show cancel button if progress is defined and indicates a busy state (0 <= progress < 1)
              const isBusy = progress !== undefined && progress >= 0 && progress < 1;
              cancelButton.style.display = isBusy ? '' : 'none'; // New logic: show if busy progress
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
      function updateMainChatMessageHistory(id, newDetail, newSummary, newSender, newMessageType) {
          const msg = chatHistory.find(m => m.id === id);
          if (msg) {
            msg.detail = newDetail;
            if (newDetail !== undefined) {
                msg.detail = newDetail;
            }
            if (newSummary !== undefined) { // Only update summary if provided
                msg.summary = newSummary;
            }
            msg.sender = newSender;
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
        const el = container.querySelector(\`#message-\${messageId}\`); // Find element within the specified container
        if (!el) return;

        const contentDiv = el.querySelector('.collapsible-content');
        const collapseButton = el.querySelector('.collapse-button');
        const progressBarContainer = el.querySelector('.progress-bar-container'); // Get progress bar
        const childMessagesContainer = el.querySelector('.child-messages-container'); // Get child container
        const headerDiv = el.querySelector('.message-header'); // Get header to check non-collapsible class


        // Only toggle if the message is actually collapsible
        if (headerDiv.classList.contains('non-collapsible')) {
             return;
        }

        if (contentDiv && collapseButton) {
            const isCollapsed = contentDiv.classList.toggle('collapsed');
            collapseButton.textContent = isCollapsed ? '▼' : '▲';

            // Hide progress bar when collapsed, unless it's completed or failed
            if (progressBarContainer) {
                 const isCompletedOrFailed = progressBarContainer.classList.contains('completed') || progressBarContainer.classList.contains('failed');
                 progressBarContainer.style.display = (isCollapsed && !isCompletedOrFailed) ? 'none' : '';
            }

            // Hide child messages container when collapsed
            if (childMessagesContainer) {
                childMessagesContainer.style.display = isCollapsed ? 'none' : '';
            }

            // Update state in chatHistory only if it's a main chat message
            if (container === messagesContainer) {
                const msg = chatHistory.find(m => m.id === messageId);
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
        messagesContainer.innerHTML = ""; // Clear DOM directly
      }

      /**
       * Scrolls the messages container to the bottom.
       */
      function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        planContainer.scrollTop = planContainer.scrollHeight; // Also scroll plan container
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
        localStorage.setItem(STORAGE_KEYS.userInput, value); // Save user input locally immediately
        vscode.postMessage({ command: "setUserPrompt", userPrompt: value });
      }, 3000);

      // Debounced update for provider settings form
      const updateProviderSettingDebounced = debounce(() => {
        if (providerFormChanged) {
          handleSaveProviderSettings();
          providerFormChanged = false; // Reset flag after saving
        }
      }, 500); // 500ms debounce delay for provider settings


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
       * Renders the selected provider in the UI.
       */
      function renderSelectedProvider() {
        selectedProviderContainer.innerHTML = ''; // Clear old buttons first
        if (currentProviderSetting) {
          const providerButton = document.createElement('div');
          providerButton.classList.add('provider-button');
          providerButton.textContent = currentProviderSetting.name;

          selectedProviderContainer.appendChild(providerButton);
        }
      }


      /**
       * Removes a file from the open files list and updates UI and extension.
       * @param {string} filePath - Path of the file to remove.
       */
      function removeFile(filePath) {
        // Update local state immediately for responsiveness
        openFiles = openFiles.filter(file => file !== filePath);
        saveState(); // Save updated file list to localStorage
        renderSelectedFiles(); // Update UI

        // Notify extension to update its state (workspaceState)
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
            // Update local state immediately for responsiveness
            openFiles.push(...newFiles);
            saveState(); // Save updated file list to localStorage
            renderSelectedFiles(); // Update UI

            // Notify extension to update its state (workspaceState)
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
          // Send file paths to extension to handle adding and updating webview state
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
        if (!currentProviderSetting) {
          alert("Please select an AI Provider in 'Providers' popup.");
          return;
        }

        sendButton.disabled = true;
        loader.style.display = "inline-block";
        buttonText.textContent = "";

        // Get checkbox states
        const autoRemoveComments = autoRemoveCommentsCheckbox.checked;
        const autoFormat = autoFormatCheckbox.checked;
        const autoFixErrors = autoFixErrorsCheckbox.checked; // Get auto fix errors state

        const messageId = Date.now().toString(); // Generate message ID locally
        // addChatMessage(user, "user", "user"); // Add user message to main chat history - Handled by receiveMessage
        // showLoadingMessage(messageId); // Show loading message in main chat history - Handled by startLoading/log

        vscode.postMessage({
          command: "sendMessage",
          user: user,
          system: system,
          fileNames: openFiles,
          toolNames: enabledTools,
          providerSetting: currentProviderSetting,
          messageId, // Pass messageId
          autoRemoveComments: autoRemoveComments, // Add checkbox state
          autoFormat: autoFormat, // Add checkbox state
          autoFixErrors: autoFixErrors // Add auto fix errors state
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

         // Get checkbox states
         const autoRemoveComments = autoRemoveCommentsCheckbox.checked;
         const autoFormat = autoFormatCheckbox.checked;
         const autoFixErrors = autoFixErrorsCheckbox.checked;

         // Clear previous plan UI
         planStepsEl.innerHTML = '';
         planGoalEl.textContent = 'AI Plan:';
         planErrorEl.style.display = 'none';
         planControlsEl.innerHTML = '';
         planContainer.style.display = 'block'; // Show the plan container

         vscode.postMessage({
           command: "planAndExecute",
           user: user,
           system: system,
           fileNames: openFiles, // Pass current open files for context
           providerSetting: currentProviderSetting,
           autoRemoveComments: autoRemoveComments,
           autoFormat: autoFormat,
           autoFixErrors: autoFixErrors,
         });
      }

      /**
       * Handles pausing the plan execution.
       */
      function handlePausePlan() {
          vscode.postMessage({ command: "pausePlan" });
      }

      /**
       * Handles resuming the plan execution.
       */
      function handleResumePlan() {
          vscode.postMessage({ command: "resumePlan" });
      }

      /**
       * Handles stopping the plan execution.
       */
      function handleStopPlan() {
          vscode.postMessage({ command: "stopPlan" });
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
          vscode.postMessage({ command: "removeCommentsInFiles", filePaths: openFiles });
      }

      /**
       * Handles formatting selected files.
       */
      function handleFormat() {
          if (openFiles.length === 0) {
              alert("Please add files first.");
              return;
          }
          vscode.postMessage({ command: "formatFilesInFiles", filePaths: openFiles });
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
          vscode.postMessage({ command: "checkErrorsInFiles", filePaths: openFiles, providerSetting: currentProviderSetting });
      }

      /**
       * Handles committing selected files.
       */
      function handleCommitFiles() {
          if (openFiles.length === 0) {
              alert("No files selected to commit.");
              return;
          }
          // You might want to prompt for a commit message here or generate one
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
       * Displays a temporary loading message in the chat.
       * @param {string} messageId - ID to assign to the loading message.
       * @param {number} [stepIndex] - Optional step index if message belongs to a plan step.
       */
      function showLoadingMessage(messageId, stepIndex = undefined) {
        // Determine the correct container based on stepIndex
        const container = stepIndex != undefined
            ? document.querySelector(\`#plan-step-\${stepIndex} .step-messages-container\`)
            : messagesContainer;

         if (!container) return;

        // Check if a loading message with this ID already exists in this container
        const existingLoadingMsg = container.querySelector(\`#message-\${messageId}\`);
        if (!existingLoadingMsg) {
             renderMessage({
                id: messageId,
                type: "loading",
                summary: "Loading response...",
                detail: "Loading response...",
                progress: 0, // Indicate busy state
                isCollapsed: false // Loading message should not be collapsed
             }, container); // Pass container to renderMessage
        }
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

      function renderProviderSettingsPopupList() {
        providerSettingsPopupListEl.innerHTML = '';
        providerSettingsList.forEach(providerSetting => {
          const listItem = document.createElement('li');
          listItem.classList.add('provider-item');

          const textSpan = document.createElement('span');
          textSpan.classList.add('prompt-text');
          textSpan.textContent = providerSetting.name;
          listItem.onclick = () => selectProviderSetting(providerSetting.name); // Select provider on click

          const editButton = document.createElement('button');
          editButton.classList.add('select-provider-button');
          editButton.textContent = '✏️'; // Pencil emoji
          editButton.title = 'Edit';
          editButton.onclick = (event) => {
            event.stopPropagation();
            loadProviderSettingToForm(providerSetting); // Load provider to form, don't close popup
          };

          const duplicateButton = document.createElement('button');
          duplicateButton.classList.add('duplicate-provider-button');
          duplicateButton.textContent = '📄'; // Copy document emoji
          duplicateButton.title = 'Duplicate';
          duplicateButton.onclick = (event) => {
            event.stopPropagation();
            handleDuplicateProviderSetting(providerSetting.name);
          };


          const deleteButton = document.createElement('button');
          deleteButton.classList.add('prompt-delete-button');
          deleteButton.textContent = '🗑️'; // Trash can emoji
          deleteButton.title = 'Delete';
          deleteButton.onclick = (event) => {
            event.stopPropagation(); // Prevent item click when delete is clicked
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
        providerVendorInput.innerHTML = '<option value="">Select Vendor</option>'; // Clear existing options and add default
        availableVendors.forEach(vendor => {
          const option = document.createElement('option');
          option.value = vendor;
          option.textContent = vendor;
          providerVendorInput.appendChild(option);
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
        toolPopupVisible = !toolPopupVisible;
        toolPopupEl.style.display = toolPopupVisible ? 'block' : 'none';
        if (toolPopupVisible) {
          renderToolPopupList();
          positionToolPopup();
        }
      }

      function toggleProviderSettingsPopup() {
        providerSettingsPopupVisible = !providerSettingsPopupVisible;
        providerSettingsPopupEl.style.display = providerSettingsPopupVisible ? 'block' : 'none';
        if (providerSettingsPopupVisible) {
          renderProviderSettingsPopupList();
          positionProviderSettingsPopup();
          renderVendorDropdown(); // Ensure dropdown is rendered when popup opens
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

      function positionProviderSettingsPopup() {
        const buttonRect = providerSettingsButton.getBoundingClientRect(); // Position relative to "Providers" button
        providerSettingsPopupEl.style.top = \`\${buttonRect.bottom + window.scrollY}px\`; // Position below the button
        providerSettingsPopupEl.style.right = \`\${window.innerWidth - buttonRect.right}px\`; // Align right edges
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

      function deleteProviderSetting(providerSettingName) {
        vscode.postMessage({ command: "deleteProviderSettingFromLibrary", providerSettingName: providerSettingName });
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
          saveState(); // Save to localStorage (for backward compatibility, main state is in extension)
          renderEnabledTools();
          vscode.postMessage({ command: "enableTool", toolName: toolName }); // Notify extension
        }
        toggleToolPopup(); // Close tool popup after enabling
      }

      function disableTool(toolName) {
        enabledTools = enabledTools.filter(tool => tool !== toolName);
        saveState(); // Save to localStorage (for backward compatibility, main state is in extension)
        renderEnabledTools();
        vscode.postMessage({ command: "disableTool", toolName: toolName }); // Notify extension
      }

      function selectProviderSetting(providerSettingName) {
        const providerSetting = providerSettingsList.find(p => p.name === providerSettingName);
        if (providerSetting) {
          currentProviderSetting = providerSetting;
          saveState(); // Save to localStorage (for backward compatibility, main state is in extension)
          renderSelectedProvider();
          vscode.postMessage({ command: "useProviderSettingFromLibrary", providerSettingName: providerSettingName }); // Notify extension
        }
        toggleProviderSettingsPopup(); // Close provider popup after selecting
      }

      function loadProviderSettingToForm(providerSetting) {
        if (providerSetting) {
          editingProviderName = providerSetting.name; // Set editing mode
          providerNameInput.value = providerSetting.name;
          providerVendorInput.value = providerSetting.vendor;
          providerApiKeyInput.value = providerSetting.apiKey;
          providerBaseURLInput.value = providerSetting.baseURL || '';
          providerModelInput.value = providerSetting.model;
          providerMaxTokensInput.value = providerSetting.max_tokens !== undefined ? String(providerSetting.max_tokens) : '';
          providerTemperatureInput.value = providerSetting.temperature !== undefined ? String(providerSetting.temperature) : ''; // Load temperature
          clearProviderFormErrors();
        }
        providerFormChanged = false; // Reset form changed flag when loading
      }

      function handleDuplicateProviderSetting(providerSettingName) {
        const originalProviderSetting = providerSettingsList.find(p => p.name === providerSettingName);
        if (originalProviderSetting) {
          const newProviderSetting = { ...originalProviderSetting };
          newProviderSetting.name = \`\${originalProviderSetting.name} Copy\`; // Create new name
          // Send as a new save command, not update, as it's a new setting
          vscode.postMessage({ command: "saveProviderSetting", providerSetting: newProviderSetting });
          // Load the duplicated provider to the form for immediate editing
          loadProviderSettingToForm(newProviderSetting);
        }
      }


      function handleAddProviderButton() {
        editingProviderName = null; // Clear editing provider name
        // Clear form fields
        providerNameInput.value = '';
        providerVendorInput.value = '';
        providerApiKeyInput.value = '';
        providerBaseURLInput.value = '';
        providerModelInput.value = '';
        providerVendorInput.value = ''; // Reset dropdown too
        providerMaxTokensInput.value = '';
        providerTemperatureInput.value = ''; // Clear temperature
        clearProviderFormErrors();
        providerFormChanged = false; // Reset form changed flag when adding new
      }


      function clearProviderFormErrors() {
          providerNameError.style.display = 'none';
          providerVendorError.style.display = 'none';
          providerApiKeyError.style.display = 'none';
          providerModelError.style.display = 'none';
          providerTemperatureError.style.display = 'none'; // Clear temperature error
      }


      function handleSaveProviderSettings() {
        const providerSetting = {
          name: providerNameInput.value.trim(),
          vendor: providerVendorInput.value,
          apiKey: providerApiKeyInput.value.trim(),
          baseURL: providerBaseURLInput.value.trim() || undefined,
          model: providerModelInput.value.trim(),
          max_tokens: providerMaxTokensInput.value.trim() ? parseInt(providerMaxTokensInput.value.trim(), 10) : undefined,
          temperature: providerTemperatureInput.value.trim() ? parseFloat(providerTemperatureInput.value.trim()) : undefined, // Parse temperature as float
        };

        clearProviderFormErrors();

        let isValid = true;
        if (!providerSetting.name) {
          providerNameError.textContent = 'Name is required';
          providerNameError.style.display = 'block';
          isValid = false;
        } else {
          // Check for duplicate name only if adding a new provider (editingProviderName is null)
          if (editingProviderName === null) {
             const existingProvider = providerSettingsList.find(p => p.name === providerSetting.name);
             if (existingProvider) {
                providerNameError.textContent = \`Provider "\${providerSetting.name}" already exists.\`;
                providerNameError.style.display = 'block';
                isValid = false;
             }
          }
        }
        if (!providerSetting.vendor) {
          providerVendorError.textContent = 'Vendor is required';
          providerVendorError.style.display = 'block';
          isValid = false;
        }
        if (!providerSetting.apiKey) {
          providerApiKeyError.textContent = 'API Key is required';
          providerApiKeyError.style.display = 'block';
          isValid = false;
        }
        if (!providerSetting.model) {
          providerModelError.textContent = 'Model is required';
          providerModelError.style.display = 'block';
          isValid = false;
        }
        if (providerSetting.temperature !== undefined && (isNaN(providerSetting.temperature) || providerSetting.temperature < 0 || providerSetting.temperature > 2)) {
            providerTemperatureError.textContent = 'Temperature must be a number between 0 and 2';
            providerTemperatureError.style.display = 'block';
            isValid = false;
        }

        if (!isValid) {
          return;
        }


        if (editingProviderName) {
          // If editing, send update command
          vscode.postMessage({ command: "updateProviderSetting", oldProviderSettingName: editingProviderName, providerSetting: providerSetting });
        } else {
          // If adding new, send save command
          vscode.postMessage({ command: "saveProviderSetting", providerSetting: providerSetting });
        }

        editingProviderName = null; // Exit editing mode
        // Optionally close the popup or clear the form after saving
        // toggleProviderSettingsPopup(); // Auto-closing might be annoying
        handleAddProviderButton(); // Clear form for next entry
      }

      function handleCancelProviderSettings() {
          editingProviderName = null; // Exit editing mode
          handleAddProviderButton(); // Clear form
          // Optionally close the popup
          // toggleProviderSettingsPopup();
      }


      /**
       * Renders the plan steps in the UI.
       * @param {AIPlan} plan - The plan object.
       */
      function renderPlan(plan) {
          planContainer.style.display = 'block';
          planGoalEl.textContent = \`AI Plan: \${plan.overallGoal}\`;
          planStepsEl.innerHTML = ''; // Clear existing steps

          // Initialize collapse states if not already present or if plan changed
          if (!planState.stepCollapsedStates || planState.stepCollapsedStates.length !== plan.steps.length) {
              planState.stepCollapsedStates = Array(plan.steps.length).fill(true); // All collapsed by default
          }


          plan.steps.forEach((step, index) => {
              const stepDiv = document.createElement('div');
              stepDiv.classList.add('plan-step');
              stepDiv.id = \`plan-step-\${index}\`; // Add ID for easy updating

              const isCollapsed = planState.stepCollapsedStates[index] ?? true; // Default to collapsed

              const headerDiv = document.createElement('div');
              headerDiv.classList.add('plan-step-header');
              headerDiv.onclick = () => togglePlanStepCollapse(index); // Make header clickable

              const statusSpan = document.createElement('span');
              statusSpan.classList.add('plan-step-status');
              statusSpan.textContent = '☐'; // Default unchecked box
              headerDiv.appendChild(statusSpan);

              const previewSpan = document.createElement('span');
              previewSpan.classList.add('plan-step-preview');
              previewSpan.textContent = \`Step \${index + 1}: \${step.description}\`; // Preview text
              headerDiv.appendChild(previewSpan);

              const collapseButton = document.createElement('button');
              collapseButton.classList.add('collapse-button');
              collapseButton.textContent = isCollapsed ? '▼' : '▲'; // Toggle icon
              headerDiv.appendChild(collapseButton);

              stepDiv.appendChild(headerDiv);

              const contentDiv = document.createElement('div');
              contentDiv.classList.add('plan-step-content');
              contentDiv.classList.toggle('collapsed', isCollapsed);

              // REMOVED: Adding full description again in the content
              // const fullDescription = document.createElement('strong');
              // fullDescription.textContent = \`Step \${index + 1}: \${step.description}\`;
              // contentDiv.appendChild(fullDescription);

              const subPromptPre = document.createElement('pre');
              subPromptPre.textContent = step.subPrompt;
              contentDiv.appendChild(subPromptPre);

              // Add container for messages specific to this step
              const stepMessagesContainer = document.createElement('div');
              stepMessagesContainer.classList.add('step-messages-container');
              stepMessagesContainer.id = \`step-messages-\${index}\`;
              contentDiv.appendChild(stepMessagesContainer);


              stepDiv.appendChild(contentDiv);

              planStepsEl.appendChild(stepDiv);
          });
          scrollToBottom(); // Scroll to show the plan
      }

      /**
       * Toggles the collapsed state of a plan step.
       * @param {number} stepIndex - The index of the step to toggle.
       */
      function togglePlanStepCollapse(stepIndex) {
          const stepDiv = document.getElementById(\`plan-step-\${stepIndex}\`);
          if (stepDiv) {
              const contentDiv = stepDiv.querySelector('.plan-step-content');
              const collapseButton = stepDiv.querySelector('.collapse-button');
              if (contentDiv && collapseButton) {
                  const isCollapsed = contentDiv.classList.toggle('collapsed');
                  collapseButton.textContent = isCollapsed ? '▼' : '▲';

                  // Update state array (optional, but good for persistence if needed)
                  if (planState.stepCollapsedStates && planState.stepCollapsedStates.length > stepIndex) {
                      planState.stepCollapsedStates[stepIndex] = isCollapsed;
                      // Note: We don't save planState to extension storage on every collapse toggle
                      // to avoid excessive messaging. This state is ephemeral within the webview session.
                      // If persistence across sessions is needed, add a postMessage here.
                  }
              }
          }
      }


      /**
       * Updates the status icon and class for a specific plan step.
       * @param {number} stepIndex - The index of the step to update.
       * @param {'pending' | 'executing' | 'completed' | 'failed'} status - The new status.
       */
      function updateStepStatus(stepIndex, status) {
          const stepDiv = document.getElementById(\`plan-step-\${stepIndex}\`);
          if (stepDiv) {
              const statusSpan = stepDiv.querySelector('.plan-step-status');
              stepDiv.classList.remove('pending', 'executing', 'completed', 'failed');
              stepDiv.classList.add(status);

              if (statusSpan) {
                  switch (status) {
                      case 'pending':
                          statusSpan.textContent = '☐';
                          break;
                      case 'executing':
                          statusSpan.innerHTML = '<span class="loader" style="width: 1em; height: 1em; border-width: 2px;"></span>'; // Small loader
                          break;
                      case 'completed':
                          statusSpan.textContent = '✅'; // Checkmark
                          break;
                      case 'failed':
                          statusSpan.textContent = '❌'; // Cross mark
                          break;
                  }
              }
          }
      }


      /**
       * Updates the visibility and state of plan control buttons based on plan state.
       */
      function updatePlanControls() {
          planControlsEl.innerHTML = ''; // Clear existing buttons
          planErrorEl.style.display = planState.error ? 'block' : 'none';
          planErrorEl.textContent = planState.error || '';

          let buttonsHtml = '';
          switch (planState.status) {
              case 'idle':
                  // No buttons needed, Plan & Execute button is visible
                  planContainer.style.display = 'none'; // Hide plan container when idle
                  resetPlanButton();
                  break;
              case 'planning':
                  // No buttons needed, loader is visible on Plan & Execute button
                  planButton.disabled = true;
                  planLoader.style.display = "inline-block";
                  planButtonText.textContent = "";
                  planContainer.style.display = 'block'; // Show plan container
                  break;
              case 'executing':
                  buttonsHtml = '<button onclick="handlePausePlan()">Pause</button><button onclick="handleStopPlan()">Stop</button>';
                  planButton.disabled = true; // Disable Plan button while executing
                  resetPlanButton(); // Ensure plan button is not showing loader
                  planContainer.style.display = 'block'; // Show plan container
                  break;
              case 'paused':
                  buttonsHtml = '<button onclick="handleResumePlan()">Resume</button><button onclick="handleStopPlan()">Stop</button>';
                  planButton.disabled = true; // Disable Plan button while paused
                  resetPlanButton(); // Ensure plan button is not showing loader
                  planContainer.style.display = 'block'; // Show plan container
                  break;
              case 'failed':
                  buttonsHtml = '<button onclick="handleResumePlan()">Resume from Failed Step</button><button onclick="handleStopPlan()">Stop & Reset</button>';
                  planButton.disabled = false; // Re-enable Plan button after failure
                  resetPlanButton();
                  planContainer.style.display = 'block'; // Show plan container
                  break;
              case 'completed':
                  buttonsHtml = '<button onclick="handleStopPlan()">Reset Plan</button>'; // Stop & Reset effectively
                  planButton.disabled = false; // Re-enable Plan button after completion
                  resetPlanButton();
                  planContainer.style.display = 'block'; // Show plan container
                  break;
          }
          planControlsEl.innerHTML = buttonsHtml;

          // Update step statuses in the UI based on the current state
          if (planState.plan && planState.plan.steps) {
              planState.plan.steps.forEach((_, index) => {
                  let status = 'pending';
                  if (index < planState.currentStepIndex) {
                      status = 'completed';
                  } else if (index === planState.currentStepIndex) {
                      status = planState.status === 'executing' ? 'executing' : (planState.status === 'failed' ? 'failed' : 'pending');
                  } else {
                      status = 'pending';
                  }
                  updateStepStatus(index, status);
              });
          }
      }


      // --- Event Listeners ---


      // Restore state and input values on window load
      window.addEventListener("load", () => {
        userInputEl.value = localStorage.getItem(STORAGE_KEYS.userInput) || "";
        // systemPromptEl.value = localStorage.getItem(STORAGE_KEYS.systemPrompt) || ""; // No longer loading systemPrompt from localStorage
        loadState(); // Load chat history, open files from localStorage
        renderChatHistory();
        renderSelectedFiles();
        // renderEnabledTools(); // Render enabled tools on load - now done after initPrompts
        // renderSelectedProvider(); // Render selected provider on load - now done after initPrompts
        // renderSystemPromptsList(); // Render system prompts on load - now done after initPrompts
        // renderUserPromptsList(); // Render user prompts on load - now done after initPrompts
        // renderProviderSettingsPopupList(); // Render provider settings list on load - now done after initPrompts
        // renderVendorDropdown(); // Render vendor dropdown on load - now done after initPrompts

        // Request initial state from extension, including workspace state like prompts, auto settings, and plan state
        // These requests will trigger messages back to the webview (e.g., initPrompts, sendEnabledTools, etc.)
        // which will then render the UI elements.
        vscode.postMessage({ command: "requestSystemPrompts" }); // Request latest prompts from extension
        vscode.postMessage({ command: "requestUserPrompts" }); // Request latest user prompts from extension
        vscode.postMessage({ command: "requestProviderSettings" }); // Request provider settings
        vscode.postMessage({ command: "requestAvailableVendors" }); // Request available vendors
        vscode.postMessage({ command: "requestEnabledTools" }); // Request enabled tools on load
        vscode.postMessage({ command: "requestCurrentProviderSetting" }); // Request current provider setting on load


        document.addEventListener('click', function(event) {
          // Close popups if click is outside
          if (systemPromptsPopupVisible && !systemPromptsPopupEl.contains(event.target) && event.target !== document.getElementById('systemPromptInput') && event.target !== systemPromptLoadButton) {
            toggleSystemPromptsPopup();
          }
          if (userPromptsPopupVisible && !userPromptsPopupEl.contains(event.target) && event.target !== document.getElementById('userInput') && event.target !== userPromptLoadButton) {
            toggleUserPromptsPopup();
          }
          if (toolPopupVisible && !toolPopupEl.contains(event.target) && event.target !== addToolButton) {
            toggleToolPopup();
          }
          if (providerSettingsPopupVisible && !providerSettingsPopupEl.contains(event.target) && event.target !== providerSettingsButton && !providerFormEl.contains(event.target)) { // Also check if click is outside the form itself
            toggleProviderSettingsPopup();
          }
        });

        // Event delegation for message collapsing
        messagesContainer.addEventListener('click', (event) => {
            const header = event.target.closest('.message-header');
            if (header) {
                const messageEl = header.closest('.message');
                // Check if the click target is NOT the cancel button
                if (!event.target.classList.contains('cancel-button') && messageEl && !header.classList.contains('non-collapsible')) {
                    const messageId = messageEl.id.replace('message-', '');
                    toggleMessageCollapse(messageId, messagesContainer);
                }
            }
        });

        // Event delegation for plan step message collapsing (needs to be added to step containers)
        // This will be handled dynamically when plan steps are rendered/updated.
        // Add a listener to the planStepsEl container and delegate
        planStepsEl.addEventListener('click', (event) => {
             const header = event.target.closest('.message-header');
             if (header) {
                 const messageEl = header.closest('.message');
                 // Find the specific step-messages-container this message belongs to
                 const stepMessagesContainer = header.closest('.step-messages-container');
                 // Check if the click target is NOT the cancel button
                 if (!event.target.classList.contains('cancel-button') && messageEl && stepMessagesContainer && !header.classList.contains('non-collapsible')) {
                     const messageId = messageEl.id.replace('message-', '');
                     toggleMessageCollapse(messageId, stepMessagesContainer);
                 }
             }
        });

      });

      // Save user input to localStorage on input change
      userInputEl.addEventListener("input", (e) => {
        // localStorage.setItem(STORAGE_KEYS.userInput, e.target.value); // Moved into debounced function
        updateUserPrompt(e.target.value); // Update workspace user prompt
      });

      // Update system prompt on input change (debounced)
      systemPromptEl.addEventListener("input", (e) => {
        updateSystemPrompt(e.target.value);
      });

      // Save checkbox states on change (send to extension to save in workspaceState)
      autoRemoveCommentsCheckbox.addEventListener('change', () => {
          vscode.postMessage({ command: "setAutoRemoveComments", checked: autoRemoveCommentsCheckbox.checked });
      });
      autoFormatCheckbox.addEventListener('change', () => {
          vscode.postMessage({ command: "setAutoFormat", checked: autoFormatCheckbox.checked });
      });
      autoFixErrorsCheckbox.addEventListener('change', () => {
          vscode.postMessage({ command: "setAutoFixErrors", checked: autoFixErrorsCheckbox.checked });
      });


      // Provider form input change listeners for debounced save
      providerNameInput.addEventListener('input', () => { providerFormChanged = true; updateProviderSettingDebounced(); });
      providerVendorInput.addEventListener('change', () => { providerFormChanged = true; updateProviderSettingDebounced(); }); // 'change' for select
      providerApiKeyInput.addEventListener('input', () => { providerFormChanged = true; updateProviderSettingDebounced(); });
      providerBaseURLInput.addEventListener('input', () => { providerFormChanged = true; updateProviderSettingDebounced(); });
      providerModelInput.addEventListener('input', () => { providerFormChanged = true; updateProviderSettingDebounced(); });
      providerMaxTokensInput.addEventListener('input', () => { providerFormChanged = true; updateProviderSettingDebounced(); });
      providerTemperatureInput.addEventListener('input', () => { providerFormChanged = true; updateProviderSettingDebounced(); }); // New input listener for temperature


      // Handle messages from the extension
      window.addEventListener("message", (event) => {
        const message = event.data;

        // Handle the new 'log' command from TaskLogger
        if (message.command === "log") {
            const { id, parentId, message: taskLog } = message; // message.message is the TaskLog object

            let targetContainer = messagesContainer; // Default to main container
            let parentMessageEl = null; // The actual parent message element if parentId is a message ID

            if (parentId) {
                // Try finding parent message in main container
                parentMessageEl = messagesContainer.querySelector(\`#message-\${parentId}\`);

                if (!parentMessageEl) {
                    // If not in main container, try finding it within any plan step's message container
                    const planSteps = planStepsEl.querySelectorAll('.plan-step');
                    for (const stepDiv of planSteps) {
                        const stepMessagesContainer = stepDiv.querySelector('.step-messages-container');
                        if (stepMessagesContainer) {
                            parentMessageEl = stepMessagesContainer.querySelector(\`#message-\${parentId}\`);
                            if (parentMessageEl) {
                                // Found parent message in a step's container
                                targetContainer = stepMessagesContainer; // Log message goes into this container
                                break; // Found it, stop searching steps
                            }
                        }
                    }
                }

                if (parentMessageEl) {
                    // Parent is another message element. The log message will be a child of this parent.
                    let childMessagesContainer = parentMessageEl.querySelector('.child-messages-container');
                    if (!childMessagesContainer) {
                        childMessagesContainer = document.createElement('div');
                        childMessagesContainer.classList.add('child-messages-container');
                        // Insert it after the message body content
                        const messageBodyContent = parentMessageEl.querySelector('.message-body-content');
                        if (messageBodyContent) {
                            messageBodyContent.after(childMessagesContainer);
                        } else {
                             // Fallback
                             const collapsibleContent = parentMessageEl.querySelector('.collapsible-content');
                             if (collapsibleContent) {
                                 collapsibleContent.appendChild(childMessagesContainer);
                             } else {
                                 parentMessageEl.appendChild(childMessagesContainer);
                             }
                        }
                    }
                    childMessagesContainer.style.display = ''; // Make container visible
                    targetContainer = childMessagesContainer; // Log message goes into the child container

                } else {
                     // ParentId was provided but no parent message element found.
                     // Assume it's a log message directly associated with a plan step.
                     const parentStepEl = document.getElementById(parentId); // Check if it's a plan step ID
                     if (parentStepEl) {
                         // Log message is associated with a plan step
                         targetContainer = parentStepEl.querySelector('.step-messages-container') || messagesContainer; // Use step's container
                     } else {
                         console.warn(\`Log message \${id} received with unknown parentId: \${parentId}\`);
                         // Default to main container if parent not found
                         targetContainer = messagesContainer;
                     }
                }
            }

            const existingEl = targetContainer.querySelector(\`#message-\${id}\`);

            if (existingEl) {
                // Update existing message element
                updateMessageElement(id, {
                    type: taskLog.type,
                    summary: taskLog.summary,
                    detail: taskLog.detail,
                    progress: taskLog.progress
                }, targetContainer); // Pass the found container
            } else {
                // Add new message element
                renderMessage({
                    id,
                    type: taskLog.type,
                    summary: taskLog.summary,
                    detail: taskLog.detail,
                    progress: taskLog.progress,
                    isCollapsed: ['prompt', 'tool', 'log', 'info', 'warning', 'error'].includes(taskLog.type || 'log')
                }, targetContainer); // Pass the found container
            }

            // After adding/updating the log message, if it had a parent *message* element,
            // re-evaluate the parent's collapsibility.
            if (parentMessageEl) {
                updateMessageCollapsibility(parentMessageEl); // Pass the parent element itself
            }

            scrollToBottom();
            return; // Processed the log command
        }


        // Handle existing commands - route them through the new rendering/updating functions
        switch (message.command) {
          case "receiveMessage":
            // This is for standard chat messages (user prompt, system prompt, tools, initial assistant message)
            // Add to chatHistory for persistence
            const newMessageId = message.messageId || Date.now().toString();
            chatHistory.push({
                id: newMessageId,
                detail: message.detail || message.text || "", // Use detail, fallback to text
                summary: message.summary || (message.detail || message.text || "").split('\\n')[0], // Use summary, fallback to first line of detail/text
                sender: message.sender,
                messageType: message.messageType || (message.sender === 'user' ? 'user' : 'assistant'),
                isCollapsed: message.isCollapsed ?? ['prompt', 'tool', 'log', 'info', 'warning', 'error'].includes(message.messageType || 'log')
            });
            saveState(); // Save updated chatHistory

            // Render using the new renderMessage function (main container)
            const addedMsg = chatHistory[chatHistory.length - 1];
            renderMessage({
                id: addedMsg.id,
                type: addedMsg.messageType,
                summary: addedMsg.summary,
                detail: addedMsg.detail,
                isCollapsed: addedMsg.isCollapsed
            }); // renderMessage defaults to messagesContainer
            scrollToBottom();
            break;
          case "updateMessage":
            // This is for updating streaming responses in main chat
            // Update chatHistory for persistence
            // Note: Streaming updates typically only provide the new text/detail, not summary or sender/type changes
            updateMainChatMessageHistory(message.messageId, message.detail || message.text || "", message.summary, message.sender, message.messageType);
            // Update DOM using the new updateMessageElement function (main container)
            updateMessageElement(message.messageId, {
                type: message.messageType,
                summary: message.summary, // Pass summary if provided
                detail: message.detail || message.text || "", // Pass detail/text
            }); // updateMessageElement defaults to messagesContainer
            scrollToBottom();
            break;
          case "endMessage":
             // This signals the end of a streaming response in main chat
             resetSendButton(); // This is correct here, for the main assistant response
             // Update chatHistory for persistence
             // Ensure final state (detail, summary, type) is saved
             updateMainChatMessageHistory(message.messageId, message.detail || message.text || "", message.summary, message.sender, message.messageType);
             // Optional: update DOM one last time with final state if needed
             // updateMessageElement(message.messageId, { type: message.messageType, summary: message.summary, detail: message.detail || message.text || "" });
             scrollToBottom();
             break;
          case "logMessage":
            // Log messages without stepIndex go to the main chat history
            // Add to chatHistory for persistence
            const newLogMessageId = message.messageId || Date.now().toString();
            chatHistory.push({
                id: newLogMessageId,
                detail: message.detail || message.text || "", // Use detail, fallback to text
                summary: message.summary || (message.detail || message.text || "").split('\\n')[0], // Use summary, fallback to first line of detail/text
                sender: "log", // Log messages are typically from the system/process
                messageType: message.messageType || 'log',
                isCollapsed: message.isCollapsed ?? true // Log messages are collapsed by default
            });
            saveState();

            // Render using the new renderMessage function (main container)
            const addedLogMsg = chatHistory[chatHistory.length - 1];
            renderMessage({
                id: addedLogMsg.id,
                type: addedLogMsg.messageType,
                summary: addedLogMsg.summary,
                detail: addedLogMsg.detail,
                isCollapsed: addedLogMsg.isCollapsed
            }); // renderMessage defaults to messagesContainer
            scrollToBottom();
            break;
          case "clearMessages":
            clearChatHistory();
            break;
          case "setOpenFiles":
            // This is received when files are added/removed via extension commands or drag/drop
            openFiles = message.files;
            saveState(); // Save updated file list to localStorage
            renderSelectedFiles(); // Update UI
            break;
          case "startLoading":
            // This is for standard chat loading indicator (including planning phase)
            // This seems to be replaced by the 'log' command with progress: 0
            // If it's still used, we map it to a loading message with progress 0
            // Note: This doesn't add to chatHistory, as it's a temporary state.
            renderMessage({
                id: message.messageId, // messageId should be provided by extension for the task
                type: 'loading',
                summary: message.summary || 'Loading...', // Use provided summary or default
                detail: message.detail || 'Loading...', // Use provided detail or default
                progress: 0,
                isCollapsed: false
            }); // renderMessage defaults to messagesContainer
            scrollToBottom();
            break;
          case "addFilesFromDialog":
            // This is received after the user selects files in the dialog
            // The extension has already handled adding them and sent setOpenFiles
            // This message might be redundant if setOpenFiles is always sent after addFiles
            addFiles(message.filePaths); // This would add them locally again, rely on setOpenFiles instead
            break;
          case "systemPromptsList": // Renamed command
            systemPrompts = message.prompts;
            renderSystemPromptsList();
            break;
          case "userPromptsList": // New command
            userPrompts = message.prompts;
            renderUserPromptsList();
            break;
          case "providerSettingsList": // New command for provider settings list
            providerSettingsList = message.providerSettingsList;
            // currentProviderSetting is handled by sendCurrentProviderSetting
            renderProviderSettingsPopupList();
            // renderSelectedProvider(); // Rendered by sendCurrentProviderSetting
            // loadState(); // Ensure currentProviderSetting is loaded from localStorage if available, after list is updated, No longer needed, rely on sendCurrentProviderSetting
            // renderSelectedProvider(); // Re-render after loadState to reflect potentially updated currentProviderSetting - No longer needed
            break;
          case "initPrompts": // New case to handle initial prompts and libraries
            currentSystemPrompt = message.systemPrompt || "";
            currentUserPrompt = message.userPrompt || "";
            systemPrompts = message.systemPrompts || [];
            userPrompts = message.userPrompts || [];
            availableTools = message.availableTools || []; // Initialize available tools
            enabledTools = message.enabledTools || []; // Initialize enabled tools
            currentProviderSetting = message.currentProviderSetting; // Initialize current provider setting
            availableVendors = message.availableVendors || []; // Initialize available vendors
            autoRemoveComments = message.autoRemoveComments ?? true; // Initialize auto remove comments
            autoFormat = message.autoFormat ?? true; // Initialize auto format
            autoFixErrors = message.autoFixErrors ?? true; // Initialize auto fix errors
            planState = message.planState; // Initialize plan state

            systemPromptEl.value = currentSystemPrompt;
            userInputEl.value = currentUserPrompt;
            autoRemoveCommentsCheckbox.checked = autoRemoveComments; // Set checkbox state from received message
            autoFormatCheckbox.checked = autoFormat; // Set checkbox state from received message
            autoFixErrorsCheckbox.checked = autoFixErrors; // Set auto fix errors checkbox state

            renderSystemPromptsList();
            renderUserPromptsList();
            renderEnabledTools(); // Render enabled tools on init
            renderSelectedProvider(); // Render selected provider on init
            renderProviderSettingsPopupList(); // Render provider settings popup list on init
            renderVendorDropdown(); // Render vendor dropdown on init
            // loadState(); // Load chat history, open files from localStorage after init
            renderSelectedFiles(); // Ensure files from loadState are rendered
            renderChatHistory(); // Ensure chat history from loadState is rendered

            // Render plan UI if a plan is active
            if (planState && planState.plan) {
                renderPlan(planState.plan);
            }
            updatePlanControls(); // Update buttons based on initial state

            break;
          case "updateEnabledTools":
            enabledTools = message.enabledTools;
            renderEnabledTools();
            break;
          case "providerSettingsUpdated":
            vscode.postMessage({ command: "requestProviderSettings" });
            break;
          // case "addProviderSetting": // Handled by providerSettingsList update
          // case "updateProviderSetting": // Handled by providerSettingsList update
          case "availableVendors":
            availableVendors = message.availableVendors;
            renderVendorDropdown();
            break;
          case "sendEnabledTools": // Receive enabled tools from extension on load
            enabledTools = message.enabledTools;
            renderEnabledTools();
            break;
          case "sendCurrentProviderSetting": // Receive current provider setting from extension on load
            currentProviderSetting = message.currentProviderSetting;
            renderSelectedProvider();
            break;

          // --- Plan Execution Messages ---
          case "displayPlan":
              // When receiving a new plan, reset collapse states
              planState.stepCollapsedStates = Array(message.plan.steps.length).fill(true);
              renderPlan(message.plan);
              break;
          case "updateStepStatus":
              updateStepStatus(message.stepIndex, message.status);
              break;
          case "updatePlanState":
              // Preserve collapse states when updating planState
              const oldPlan = planState.plan;
              planState = message.planState;
              if (oldPlan && planState.plan && oldPlan.steps.length === planState.plan.steps.length) {
                  // If plan structure is the same, keep old collapse states
                  // This handles status updates without re-rendering the whole plan
              } else if (planState.plan) {
                   // If plan structure changed or is new, reset collapse states
                   planState.stepCollapsedStates = Array(planState.plan.steps.length).fill(true);
                   renderPlan(planState.plan); // Re-render if plan structure changed
              } else {
                   // If plan is null, clear plan UI
                   planStepsEl.innerHTML = '';
                   planGoalEl.textContent = 'AI Plan:';
                   planContainer.style.display = 'none';
                   planState.stepCollapsedStates = [];
              }
              updatePlanControls(); // Update buttons and error message
              // Update step statuses based on the new state (this is redundant if renderPlan is called, but safe)
              if (planState.plan && planState.plan.steps) {
                  planState.plan.steps.forEach((_, index) => {
                      let status = 'pending';
                      if (index < planState.currentStepIndex) {
                          status = 'completed';
                      } else if (index === planState.currentStepIndex) {
                          status = planState.status === 'executing' ? 'executing' : (planState.status === 'failed' ? 'failed' : 'pending');
                      } else {
                          status = 'pending';
                      }
                      updateStepStatus(index, status);
                  });
              }
              break;

          default:
            console.warn("Unknown command:", message.command);
        }
      });

      // Expose functions to the global scope.
      window.handleSendMessage = handleSendMessage;
      window.handlePlanAndExecute = handlePlanAndExecute; // Expose new function
      window.handlePausePlan = handlePausePlan; // Expose new function
      window.handleResumePlan = handleResumePlan; // Expose new function
      window.handleStopPlan = handleStopPlan; // Expose new function
      window.handleCancelTask = handleCancelTask; // Expose new function
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
      window.handleCancelProviderSettings = handleCancelProviderSettings; // Expose cancel
      window.clearProviderFormErrors = clearProviderFormErrors;
      window.handleSaveProviderSettings = handleSaveProviderSettings; // Expose save
      // window.handleAddProviderSetting = handleAddProviderSetting; // Internal helper, not needed globally
      // window.handleUpdateProviderSetting = handleUpdateProviderSetting; // Internal helper, not needed globally
      window.toggleMessageCollapse = toggleMessageCollapse;
      window.handleRemoveComments = handleRemoveComments; // Expose new function
      window.handleFormat = handleFormat; // Expose new function
      window.handleFixErrors = handleFixErrors; // Expose new function
      window.handleCommitFiles = handleCommitFiles; // Expose new function
      window.updateStepStatus = updateStepStatus; // Expose for potential manual testing/debugging
      window.togglePlanStepCollapse = togglePlanStepCollapse; // Expose new function
      window.handleTestTask = handleTestTask; // Expose new test task function
      window.handleTestMultiTask = handleTestMultiTask; // Expose new test multi-task function
      window.handleTestSerialTask = handleTestSerialTask; // Expose new test serial-task function
    </script>
  </body>
</html>
`;
