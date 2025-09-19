import * as vscode from "vscode";

export interface ShellProfile {
  name: string;
  path: string;
}

function expandPath(path: string): string {
  if (!path) {
    return path;
  }

  let expandedPath = path.replace(/\${env:([^}]+)}/g, (match, varName) => {
    const envVar = Object.keys(process.env).find(
      (key) => key.toLowerCase() === varName.toLowerCase()
    );
    return envVar ? process.env[envVar] || "" : "";
  });

  if (
    process.platform === "win32" &&
    process.arch === "x64" &&
    expandedPath.toLowerCase().includes("\\sysnative\\")
  ) {
    expandedPath = expandedPath.replace(/\\sysnative\\/i, "\\System32\\");
  }

  return expandedPath;
}

export function getAvailableShells(): ShellProfile[] {
  const config = vscode.workspace.getConfiguration(
    "terminal.integrated.profiles"
  );
  const platform = process.platform;

  let profiles: { [key: string]: any } | undefined;
  if (platform === "win32") {
    profiles = config.get("windows");
  } else if (platform === "darwin") {
    profiles = config.get("osx");
  } else {
    profiles = config.get("linux");
  }

  if (!profiles) {
    return [];
  }

  const shellProfiles: ShellProfile[] = [];

  for (const name in profiles) {
    const profile = profiles[name];
    if (!profile) {
      continue;
    }

    let path: string | undefined = undefined;

    if (typeof profile === "string") {
      path = profile;
    } else if (typeof profile.path === "string") {
      path = profile.path;
    } else if (
      Array.isArray(profile.path) &&
      typeof profile.path[0] === "string"
    ) {
      path = profile.path[0];
    } else if (profile.source) {
      const lowerSource = profile.source.toLowerCase();
      if (lowerSource.includes("powershell")) {
        path = "powershell.exe";
      } else if (lowerSource.includes("git bash")) {
        path = "C:\\Program Files\\Git\\bin\\bash.exe";
      } else if (lowerSource.includes("cmd")) {
        path = "cmd.exe";
      }
    }

    if (path) {
      const expandedPath = expandPath(path);
      if (expandedPath) {
        shellProfiles.push({ name, path: expandedPath });
      }
    }
  }
  return shellProfiles;
}
