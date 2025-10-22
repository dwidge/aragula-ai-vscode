import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import './PromptsPopup.css';

interface PromptsPopupProps {
  prompts: string[];
  type: 'system' | 'user';
  visible: boolean;
  onClose: () => void;
  onLoadPrompt: (prompt: string) => void;
  onDeletePrompt: (prompt: string) => void;
}

const PromptsPopup: React.FC<PromptsPopupProps> = ({ prompts, type, visible, onClose, onLoadPrompt, onDeletePrompt }) => {
  if (!visible) return null;

  return (
    <div className="prompt-popup" style={{ display: 'block' }}>
      <ul className="prompts-list">
        {prompts.map((prompt) => (
          <li key={prompt} className="prompt-item" onClick={() => onLoadPrompt(prompt)}>
            <span className="prompt-text">{prompt}</span>
            <button
              className="prompt-delete-button"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePrompt(prompt);
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PromptsPopup;
