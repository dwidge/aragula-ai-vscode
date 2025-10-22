import React from "react";
import { useSettings } from "../contexts/SettingsContext";
import { PrivacyPair } from "../types";
import Overlay from "./Overlay";
import "./PrivacySettingsPopup.css";

const PrivacySettingsPopup: React.FC = () => {
  const {
    privacySettingsPopupVisible,
    setPrivacySettingsPopupVisible,
    isPrivacyMaskingEnabled,
    setIsPrivacyMaskingEnabled,
    privacySettings,
    setPrivacySettings,
    editingPrivacyPairSearch,
    setEditingPrivacyPairSearch,
    privacyForm,
    setPrivacyForm,
    sendSettingsUpdate,
  } = useSettings();

  const closePrivacySettingsPopup = React.useCallback(
    () => setPrivacySettingsPopupVisible(false),
    [setPrivacySettingsPopupVisible]
  );

  const handlePrivacyMaskingChange = React.useCallback(
    (checked: boolean) => {
      setIsPrivacyMaskingEnabled(checked);
      sendSettingsUpdate({ isPrivacyMaskingEnabled: checked });
    },
    [setIsPrivacyMaskingEnabled, sendSettingsUpdate]
  );

  const handleAddPrivacyPair = React.useCallback(() => {
    setEditingPrivacyPairSearch(null);
    setPrivacyForm({ search: "", replace: "" });
  }, [setEditingPrivacyPairSearch, setPrivacyForm]);

  const loadPrivacyPairToForm = React.useCallback(
    (pair: PrivacyPair) => {
      setEditingPrivacyPairSearch(pair.search);
      setPrivacyForm({ search: pair.search, replace: pair.replace });
    },
    [setEditingPrivacyPairSearch, setPrivacyForm]
  );

  const handleSavePrivacyPair = React.useCallback(() => {
    const { search, replace } = privacyForm;
    if (!search.trim()) return;

    let newSettings: PrivacyPair[];
    if (editingPrivacyPairSearch !== null) {
      newSettings = privacySettings.map((p) =>
        p.search === editingPrivacyPairSearch
          ? { search: search.trim(), replace: replace.trim() }
          : p
      );
    } else {
      newSettings = [
        ...privacySettings,
        { search: search.trim(), replace: replace.trim() },
      ];
    }

    setPrivacySettings(newSettings);
    sendSettingsUpdate({ privacySettings: newSettings });
    handleAddPrivacyPair();
  }, [
    privacyForm,
    editingPrivacyPairSearch,
    privacySettings,
    sendSettingsUpdate,
    handleAddPrivacyPair,
    setPrivacySettings,
  ]);

  const deletePrivacyPair = React.useCallback(
    (search: string) => {
      const newSettings = privacySettings.filter((p) => p.search !== search);
      setPrivacySettings(newSettings);
      sendSettingsUpdate({ privacySettings: newSettings });
      if (editingPrivacyPairSearch === search) {
        handleAddPrivacyPair();
      }
    },
    [
      privacySettings,
      editingPrivacyPairSearch,
      sendSettingsUpdate,
      handleAddPrivacyPair,
      setPrivacySettings,
    ]
  );

  const handlePrivacyFormChange = React.useCallback(
    (field: string, value: string) => {
      setPrivacyForm((prev) => ({ ...prev, [field]: value }));
    },
    [setPrivacyForm]
  );

  if (!privacySettingsPopupVisible) return null;

  return (
    <>
      <Overlay close={closePrivacySettingsPopup} />
      <div
        id="privacy-popup"
        className="privacy-popup"
        style={{ display: "block", zIndex: 10 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closePrivacySettingsPopup();
          }
        }}
      >
        <div className="popup-header">
          <span>Privacy Settings</span>
          <button className="close-button" onClick={closePrivacySettingsPopup}>
            ✕
          </button>
        </div>
        <div className="privacy-popup-header">
          <button
            className="add-privacy-pair-button"
            onClick={handleAddPrivacyPair}
          >
            +
          </button>
        </div>
        <div className="auto-checkbox" style={{ marginBottom: "10px" }}>
          <input
            type="checkbox"
            checked={isPrivacyMaskingEnabled}
            onChange={(e) => handlePrivacyMaskingChange(e.target.checked)}
          />
          <label>Enable Data Masking</label>
        </div>
        <ul id="privacy-popup-list" className="privacy-list">
          {privacySettings.length === 0 ? (
            <li style={{ textAlign: "center", padding: "10px" }}>
              No masking pairs configured.
            </li>
          ) : (
            privacySettings.map((pair) => (
              <li key={pair.search} className="privacy-item">
                <span className="prompt-text">
                  {pair.search} → {pair.replace}
                </span>
                <div>
                  <button
                    className="edit-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadPrivacyPairToForm(pair);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePrivacyPair(pair.search);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
        <div
          id="privacy-form"
          className="privacy-form"
          style={{
            display:
              editingPrivacyPairSearch !== null ||
              privacyForm.search ||
              privacyForm.replace
                ? "block"
                : "none",
          }}
        >
          <h3>{editingPrivacyPairSearch ? "Edit" : "Add"} Replacement Pair</h3>
          <label>Sensitive String (Search):</label>
          <input
            type="text"
            value={privacyForm.search}
            onChange={(e) => handlePrivacyFormChange("search", e.target.value)}
          />
          <label>Dummy Placeholder (Replace):</label>
          <input
            type="text"
            value={privacyForm.replace}
            onChange={(e) => handlePrivacyFormChange("replace", e.target.value)}
          />
          <div className="privacy-form-buttons">
            <button onClick={handleSavePrivacyPair}>Save</button>
            <button
              onClick={() => {
                handleAddPrivacyPair();
                closePrivacySettingsPopup();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacySettingsPopup;
