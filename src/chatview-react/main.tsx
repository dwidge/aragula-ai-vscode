import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./src/App";
import { VscodeApiProvider } from "./src/contexts/VscodeApiContext";
import "./src/index.css";

declare function acquireVsCodeApi(): { postMessage: (v: object) => void };
const vscode = acquireVsCodeApi();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <VscodeApiProvider value={{ postMessage: vscode.postMessage }}>
      <App />
    </VscodeApiProvider>
  </React.StrictMode>
);
