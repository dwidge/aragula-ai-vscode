import { expect } from "vitest";
import { render, screen, userEvent, waitFor } from "../tests/test-utils";
import PrivacySettingsPopup from "./PrivacySettingsPopup";

describe("PrivacySettingsPopup", () => {
  it("does not render when privacySettingsPopupVisible is false", () => {
    render(<PrivacySettingsPopup />, {
      providerProps: {
        settingsContext: { privacySettingsPopupVisible: false },
      },
    });
    expect(screen.queryByText("Privacy Settings")).not.toBeInTheDocument();
  });

  it("renders when privacySettingsPopupVisible is true", () => {
    render(<PrivacySettingsPopup />, {
      providerProps: {
        settingsContext: {
          privacySettingsPopupVisible: true,
          privacySettings: [{ search: "secret1", replace: "MASKED_SECRET1" }],
        },
      },
    });
    expect(screen.getByText("Privacy Settings")).toBeInTheDocument();
    expect(screen.getByText("Enable Data Masking")).toBeInTheDocument();
    expect(screen.getByText("secret1 → MASKED_SECRET1")).toBeInTheDocument();
  });

  it("calls setPrivacySettingsPopupVisible when close button is clicked", async () => {
    const setPrivacySettingsPopupVisible = vi.fn();
    render(<PrivacySettingsPopup />, {
      providerProps: {
        settingsContext: {
          privacySettingsPopupVisible: true,
          setPrivacySettingsPopupVisible,
        },
      },
    });
    await userEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(setPrivacySettingsPopupVisible).toHaveBeenCalledWith(false);
  });

  it("toggles enable data masking checkbox and updates settings", async () => {
    const setIsPrivacyMaskingEnabled = vi.fn();
    const sendSettingsUpdate = vi.fn();
    render(<PrivacySettingsPopup />, {
      providerProps: {
        settingsContext: {
          privacySettingsPopupVisible: true,
          isPrivacyMaskingEnabled: false,
          setIsPrivacyMaskingEnabled,
          sendSettingsUpdate,
        },
      },
    });
    const checkbox = screen.getByLabelText("Enable Data Masking");
    expect(checkbox).not.toBeChecked();

    await userEvent.click(checkbox);
    expect(setIsPrivacyMaskingEnabled).toHaveBeenCalledWith(true);
    expect(sendSettingsUpdate).toHaveBeenCalledWith({
      isPrivacyMaskingEnabled: true,
    });
  });

  it("deletes a privacy pair", async () => {
    const user = userEvent.setup();
    const setPrivacySettings = vi.fn();
    const sendSettingsUpdate = vi.fn();
    const privacySettings = [
      { search: "secret1", replace: "MASKED_SECRET1" },
      { search: "token_xyz", replace: "[TOKEN]" },
    ];

    render(<PrivacySettingsPopup />, {
      providerProps: {
        settingsContext: {
          privacySettingsPopupVisible: true,
          privacySettings,
          setPrivacySettings,
          sendSettingsUpdate,
        },
      },
    });

    const deleteButton = screen.getAllByRole("button", { name: "🗑️" })[0];
    await user.click(deleteButton);

    await waitFor(() => {
      const expectedSettings = [{ search: "token_xyz", replace: "[TOKEN]" }];
      expect(setPrivacySettings).toHaveBeenCalledWith(expectedSettings);
      expect(sendSettingsUpdate).toHaveBeenCalledWith({
        privacySettings: expectedSettings,
      });
    });
  });
});
