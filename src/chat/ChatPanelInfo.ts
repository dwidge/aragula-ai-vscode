import * as vscode from "vscode";
import { ActiveTasks, PendingFormRequests } from "../utils/Logger";

export interface ChatPanelInfo {
  panel: vscode.WebviewPanel;
  activeTasks: ActiveTasks;
  pendingFormRequests: PendingFormRequests;
}
