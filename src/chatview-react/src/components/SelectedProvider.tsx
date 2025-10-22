import React from "react";
import { AIProviderSettings } from "../types";
import "./SelectedProvider.css";

interface SelectedProviderProps {
  provider?: AIProviderSettings;
}

const SelectedProvider: React.FC<SelectedProviderProps> = ({ provider }) => (
  <div id="selected-provider-container">
    {provider && <div className="provider-button">{provider.name}</div>}
  </div>
);

export default SelectedProvider;
