import {
  RenderOptions,
  render as testingLibraryRender,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { ReactElement } from "react";
import { vi } from "vitest";
import { ChatProvider } from "../contexts/ChatContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { VscodeApiProvider } from "../contexts/VscodeApiContext";
import { getMockChatContext, getMockSettingsContext } from "./mock-contexts";

const mockPostMessage = vi.fn();

const AllTheProviders: React.FC<{
  children: React.ReactNode;
  chatContext?: any;
  settingsContext?: any;
  vscodeApi?: any;
}> = ({
  children,
  chatContext,
  settingsContext,
  vscodeApi = { postMessage: mockPostMessage },
}) => {
  const chatValue = { ...getMockChatContext(), ...chatContext };
  const settingsValue = { ...getMockSettingsContext(), ...settingsContext };

  return (
    <VscodeApiProvider value={vscodeApi}>
      <ChatProvider value={chatValue}>
        <SettingsProvider value={settingsValue}>{children}</SettingsProvider>
      </ChatProvider>
    </VscodeApiProvider>
  );
};

const render = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & {
    providerProps?: { chatContext?: any; settingsContext?: any };
  }
) =>
  testingLibraryRender(ui, {
    wrapper: (props) => (
      <AllTheProviders {...props} {...options?.providerProps} />
    ),
    ...options,
  });

export * from "@testing-library/react";
export { mockPostMessage, render, userEvent };
