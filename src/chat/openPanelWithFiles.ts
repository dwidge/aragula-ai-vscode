import * as vscode from "vscode";
import { readOpenFilePaths } from "../file/readOpenFilePaths";
import { newPostMessage } from "../PostMessage";
import { GetterSetter } from "../settingsObject";
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

const openExistingPanelWithFiles = (
  panelInfo: ChatPanelInfo,
  filePaths: string[]
) => {
  panelInfo.panel.reveal(vscode.ViewColumn.One);
  const postMessage = newPostMessage(panelInfo.panel);
  postMessage({
    command: "addFiles",
    filePaths,
  });
};

const openNewPanelWithFiles = async (
  context: vscode.ExtensionContext,
  filePaths: string[],
  globalSettings: GetterSetter
) => openChatWindow(context, filePaths, globalSettings);

export type OpenPanelFiles = (multi: vscode.Uri[]) => Promise<void>;

export const getOpenPanelWithFiles =
  (
    context: vscode.ExtensionContext,
    globalSettings: GetterSetter
  ): OpenPanelFiles =>
  async (multi) => {
    const openFilePaths = await readOpenFilePaths(
      multi.map((uri) => uri.fsPath)
    );

    const existingPanelInfo = findExistingPanelInfo();

    if (existingPanelInfo) {
      openExistingPanelWithFiles(existingPanelInfo, openFilePaths);
    } else {
      await openNewPanelWithFiles(context, openFilePaths, globalSettings);
    }
  };
