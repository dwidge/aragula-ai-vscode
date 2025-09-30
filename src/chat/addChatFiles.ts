import { GetterSetter, useWorkspaceSettings } from "@/settingsObject";

export async function addChatFiles(
  workspaceSettingsState: GetterSetter,
  filePaths: string[]
) {
  const [, setWorkspaceSettings] = useWorkspaceSettings(workspaceSettingsState);
  const workspaceSettings = await setWorkspaceSettings((prev) => ({
    ...prev,
    openFiles: [
      ...prev.openFiles,
      ...filePaths.filter((p) => !prev.openFiles.includes(p)),
    ],
  }));
  return workspaceSettings;
}

export async function removeChatFiles(
  workspaceSettingsState: GetterSetter,
  filePaths: string[]
) {
  const [, setWorkspaceSettings] = useWorkspaceSettings(workspaceSettingsState);
  const workspaceSettings = await setWorkspaceSettings((prev) => ({
    ...prev,
    openFiles: prev.openFiles.filter((p) => !filePaths.includes(p)),
  }));
  return workspaceSettings;
}
