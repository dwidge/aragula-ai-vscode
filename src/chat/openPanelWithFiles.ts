import { sendWorkspaceSettingsToWebview } from "@/sendSettingsToWebview";
import * as vscode from "vscode";
import { readOpenFilePaths } from "../file/readOpenFilePaths";
import { newPostMessage } from "../PostMessage";
import { GetterSetter } from "../settingsObject";
import { addChatFiles } from "./addChatFiles";
import { ChatPanelInfo } from "./ChatPanelInfo";
import { chatPanels } from "./chatPanels";
import { openChatWindow } from "./openChatWindow";

const findExistingPanelInfo = (): ChatPanelInfo | undefined => {
  for (const panelInfo of chatPanels.values()) {
    if (panelInfo?.panel) {
      return panelInfo;
    }
  }
};

const openExistingPanelWithFiles = async (
  panelInfo: ChatPanelInfo,
  filePaths: string[],
  workspaceSettingsState: GetterSetter
) => {
  const workspaceSettings = await addChatFiles(
    workspaceSettingsState,
    filePaths
  );
  const postMessage = newPostMessage(panelInfo.panel);
  await sendWorkspaceSettingsToWebview(postMessage, workspaceSettings);

  panelInfo.panel.reveal(vscode.ViewColumn.One);
};

const openNewPanelWithFiles = async (
  context: vscode.ExtensionContext,
  filePaths: string[],
  globalSettings: GetterSetter,
  workspaceSettings: GetterSetter
) => openChatWindow(context, filePaths, globalSettings, workspaceSettings);

export type OpenPanelFiles = (multi: vscode.Uri[]) => Promise<void>;

export const getOpenPanelWithFiles =
  (
    context: vscode.ExtensionContext,
    globalSettings: GetterSetter,
    workspaceSettings: GetterSetter
  ): OpenPanelFiles =>
  async (multi) => {
    const openFilePaths = await readOpenFilePaths(
      multi.map((uri) => uri.fsPath)
    );

    const existingPanelInfo = findExistingPanelInfo();

    if (existingPanelInfo) {
      await openExistingPanelWithFiles(
        existingPanelInfo,
        openFilePaths,
        workspaceSettings
      );
    } else {
      await openNewPanelWithFiles(
        context,
        openFilePaths,
        globalSettings,
        workspaceSettings
      );
    }
  };
