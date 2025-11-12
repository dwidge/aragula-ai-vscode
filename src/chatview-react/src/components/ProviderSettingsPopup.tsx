import React, { useEffect, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { AIProviderSettings } from "../types";
import Overlay from "./Overlay";
import "./ProviderSettingsPopup.css";

const ProviderSettingsPopup: React.FC = () => {
  const {
    providerSettingsPopupVisible,
    setProviderSettingsPopupVisible,
    providerSettingsList,
    setProviderSettingsList,
    currentProviderSetting,
    setCurrentProviderSetting,
    editingProviderName,
    setEditingProviderName,
    providerForm,
    setProviderForm,
    availableVendors,
    sendSettingsUpdate,
  } = useSettings();

  const [isEditing, setIsEditing] = useState(!!editingProviderName);

  useEffect(() => {
    setIsEditing(!!editingProviderName);
  }, [editingProviderName]);

  const closeProviderSettingsPopup = React.useCallback(
    () => setProviderSettingsPopupVisible(false),
    [setProviderSettingsPopupVisible]
  );

  const handleAddProvider = React.useCallback(() => {
    setEditingProviderName(null);
    setProviderForm({
      name: "",
      vendor: "",
      apiKey: "",
      baseURL: "",
      model: "",
      provider: "",
      maxTokens: "",
      temperature: "",
    });
  }, [setEditingProviderName, setProviderForm]);

  const loadProviderToForm = React.useCallback(
    (setting: AIProviderSettings) => {
      setIsEditing(true);
      setEditingProviderName(setting.name);
      setProviderForm({
        name: setting.name,
        vendor: setting.vendor,
        apiKey: setting.apiKey,
        baseURL: setting.baseURL || "",
        model: setting.model,
        provider: setting.provider || "",
        maxTokens: setting.max_tokens?.toString() || "",
        temperature: setting.temperature?.toString() || "",
      });
    },
    [setEditingProviderName, setProviderForm]
  );

  const handleSaveProvider = React.useCallback(() => {
    const formData = providerForm;
    const setting: AIProviderSettings = {
      name: formData.name.trim(),
      vendor: formData.vendor,
      apiKey: formData.apiKey.trim(),
      baseURL: formData.baseURL.trim() || undefined,
      model: formData.model.trim(),
      provider: formData.provider.trim() || undefined,
      max_tokens: formData.maxTokens
        ? parseInt(formData.maxTokens, 10)
        : undefined,
      temperature: formData.temperature
        ? parseFloat(formData.temperature)
        : undefined,
    };

    if (!setting.name || !setting.vendor || !setting.model) return;

    let newList: AIProviderSettings[];
    if (editingProviderName) {
      newList = providerSettingsList.map((p) =>
        p.name === editingProviderName ? setting : p
      );
    } else {
      newList = [...providerSettingsList, setting];
    }

    setProviderSettingsList(newList);
    sendSettingsUpdate({ providerList: newList });

    if (
      !currentProviderSetting ||
      editingProviderName === currentProviderSetting.name
    ) {
      setCurrentProviderSetting(setting);
      sendSettingsUpdate({ providerName: setting.name });
    }

    handleAddProvider();
    closeProviderSettingsPopup();
  }, [
    providerForm,
    editingProviderName,
    providerSettingsList,
    currentProviderSetting,
    sendSettingsUpdate,
    handleAddProvider,
    closeProviderSettingsPopup,
    setProviderSettingsList,
    setCurrentProviderSetting,
  ]);

  const duplicateProvider = React.useCallback(
    (original: AIProviderSettings) => {
      const newSetting = { ...original, name: `${original.name} Copy` };
      const newList = [...providerSettingsList, newSetting];
      setProviderSettingsList(newList);
      sendSettingsUpdate({
        providerList: newList,
      });
      loadProviderToForm(newSetting);
    },
    [
      providerSettingsList,
      sendSettingsUpdate,
      loadProviderToForm,
      setProviderSettingsList,
    ]
  );

  const deleteProvider = React.useCallback(
    (name: string) => {
      const newList = providerSettingsList.filter((p) => p.name !== name);
      setProviderSettingsList(newList);
      sendSettingsUpdate({ providerList: newList });
      if (currentProviderSetting?.name === name) {
        setCurrentProviderSetting(undefined);
        sendSettingsUpdate({ providerName: null });
      }
      if (editingProviderName === name) {
        handleAddProvider();
      }
    },
    [
      providerSettingsList,
      currentProviderSetting,
      editingProviderName,
      sendSettingsUpdate,
      handleAddProvider,
      setProviderSettingsList,
      setCurrentProviderSetting,
    ]
  );

  const selectProvider = React.useCallback(
    (name: string) => {
      const setting = providerSettingsList.find((p) => p.name === name);
      if (setting) {
        setCurrentProviderSetting(setting);
        sendSettingsUpdate({ providerName: name });
      }
    },
    [providerSettingsList, sendSettingsUpdate, setCurrentProviderSetting]
  );

  const handleProviderFormChange = React.useCallback(
    (field: string, value: string) => {
      setProviderForm((prev) => ({ ...prev, [field]: value }));
    },
    [setProviderForm]
  );

  if (!providerSettingsPopupVisible) return null;

  return (
    <>
      <Overlay close={closeProviderSettingsPopup} />
      <div
        id="provider-popup"
        className="provider-popup"
        style={{ display: "block", zIndex: 10 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeProviderSettingsPopup();
          }
        }}
      >
        <div className="popup-header">
          <span>Providers</span>
          <button className="close-button" onClick={closeProviderSettingsPopup}>
            ✕
          </button>
        </div>
        <div className="provider-popup-header">
          <button className="add-provider-button" onClick={handleAddProvider}>
            +
          </button>
        </div>
        <ul id="provider-popup-list" className="provider-list">
          {providerSettingsList.map((setting) => (
            <li
              key={setting.name}
              className="provider-item"
              onClick={() => selectProvider(setting.name)}
            >
              <span className="prompt-text">{setting.name}</span>
              <button
                className="duplicate-provider-button"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateProvider(setting);
                }}
              >
                📄
              </button>
              <button
                className="select-provider-button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadProviderToForm(setting);
                }}
              >
                ✏️
              </button>
              <button
                className="prompt-delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProvider(setting.name);
                }}
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
        <div id="provider-form" className="provider-form">
          <h3>{isEditing ? "Edit" : "Add"} Provider</h3>
          <label>Name:</label>
          <input
            type="text"
            value={providerForm.name}
            onChange={(e) => handleProviderFormChange("name", e.target.value)}
          />
          <label>Vendor:</label>
          <select
            value={providerForm.vendor}
            onChange={(e) => handleProviderFormChange("vendor", e.target.value)}
          >
            <option value="">Select Vendor</option>
            {availableVendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
          <label>API Key:</label>
          <input
            type="text"
            value={providerForm.apiKey}
            onChange={(e) => handleProviderFormChange("apiKey", e.target.value)}
          />
          <label>Base URL (optional):</label>
          <input
            type="text"
            value={providerForm.baseURL}
            onChange={(e) =>
              handleProviderFormChange("baseURL", e.target.value)
            }
          />
          <label>Model:</label>
          <input
            type="text"
            value={providerForm.model}
            onChange={(e) => handleProviderFormChange("model", e.target.value)}
          />
          <label>Provider (optional):</label>
          <input
            type="text"
            value={providerForm.provider}
            onChange={(e) =>
              handleProviderFormChange("provider", e.target.value)
            }
          />
          <label>Max Tokens (optional):</label>
          <input
            type="number"
            value={providerForm.maxTokens}
            onChange={(e) =>
              handleProviderFormChange("maxTokens", e.target.value)
            }
          />
          <label>Temperature (optional, 0-2):</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={providerForm.temperature}
            onChange={(e) =>
              handleProviderFormChange("temperature", e.target.value)
            }
          />
          <div className="provider-form-buttons">
            <button onClick={handleSaveProvider}>Save</button>
            <button
              onClick={() => {
                handleAddProvider();
                closeProviderSettingsPopup();
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

export default ProviderSettingsPopup;
