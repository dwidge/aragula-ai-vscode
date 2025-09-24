import * as fs from "fs/promises";
import path from "path";
import * as vscode from "vscode";

export const getTextAsset = async (
  extensionPath: string,
  assetFileName: string
) => {
  try {
    const assetPathInDist = path.join(extensionPath, "dist", assetFileName);
    const fileUri = vscode.Uri.file(assetPathInDist);
    return await fs.readFile(fileUri.fsPath, "utf8");
  } catch (error) {
    throw new Error(
      `getTextAssetE1: Could not read asset file: ${assetFileName}: ${error}`
    );
  }
};
