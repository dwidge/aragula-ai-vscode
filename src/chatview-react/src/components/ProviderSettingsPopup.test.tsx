import { expect } from "vitest";
import { render, screen, userEvent, waitFor } from "../tests/test-utils";
import ProviderSettingsPopup from "./ProviderSettingsPopup";

const mockProviderList = [
  {
    name: "Provider A",
    vendor: "OpenAI",
    apiKey: "key-a",
    model: "gpt-3.5-turbo",
  },
  {
    name: "Provider B",
    vendor: "Anthropic",
    apiKey: "key-b",
    model: "claude-2",
  },
];

describe("ProviderSettingsPopup", () => {
  it("does not render when providerSettingsPopupVisible is false", () => {
    render(<ProviderSettingsPopup />, {
      providerProps: {
        settingsContext: { providerSettingsPopupVisible: false },
      },
    });
    expect(screen.queryByText("Providers")).not.toBeInTheDocument();
  });

  it("renders when providerSettingsPopupVisible is true", () => {
    render(<ProviderSettingsPopup />, {
      providerProps: {
        settingsContext: {
          providerSettingsPopupVisible: true,
          providerSettingsList: mockProviderList,
        },
      },
    });
    expect(screen.getByText("Providers")).toBeInTheDocument();
    expect(screen.getByText("Provider A")).toBeInTheDocument();
    expect(screen.getByText("Provider B")).toBeInTheDocument();
  });

  it("calls setProviderSettingsPopupVisible when close button is clicked", async () => {
    const setProviderSettingsPopupVisible = vi.fn();
    render(<ProviderSettingsPopup />, {
      providerProps: {
        settingsContext: {
          providerSettingsPopupVisible: true,
          setProviderSettingsPopupVisible,
        },
      },
    });
    await userEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(setProviderSettingsPopupVisible).toHaveBeenCalledWith(false);
  });

  it("selects a provider when clicking on its list item", async () => {
    const user = userEvent.setup();
    const setCurrentProviderSetting = vi.fn();
    const sendSettingsUpdate = vi.fn();

    render(<ProviderSettingsPopup />, {
      providerProps: {
        settingsContext: {
          providerSettingsPopupVisible: true,
          providerSettingsList: mockProviderList,
          setCurrentProviderSetting,
          sendSettingsUpdate,
        },
      },
    });

    const providerBItem = screen.getByText("Provider B");
    await user.click(providerBItem);

    expect(setCurrentProviderSetting).toHaveBeenCalledWith(mockProviderList[1]);
    expect(sendSettingsUpdate).toHaveBeenCalledWith({
      providerName: "Provider B",
    });
  });

  it("deletes a provider", async () => {
    const user = userEvent.setup();
    const setProviderSettingsList = vi.fn();
    const sendSettingsUpdate = vi.fn();
    const setCurrentProviderSetting = vi.fn();

    render(<ProviderSettingsPopup />, {
      providerProps: {
        settingsContext: {
          providerSettingsPopupVisible: true,
          providerSettingsList: mockProviderList,
          currentProviderSetting: mockProviderList[0],
          setProviderSettingsList,
          sendSettingsUpdate,
          setCurrentProviderSetting,
        },
      },
    });

    const deleteButton = screen.getAllByRole("button", { name: "🗑️" })[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(setProviderSettingsList).toHaveBeenCalledWith([
        mockProviderList[1],
      ]);
      expect(sendSettingsUpdate).toHaveBeenCalledWith({
        providerList: [mockProviderList[1]],
      });
      expect(setCurrentProviderSetting).toHaveBeenCalledWith(undefined);
      expect(sendSettingsUpdate).toHaveBeenCalledWith({ providerName: null });
    });
  });
});
