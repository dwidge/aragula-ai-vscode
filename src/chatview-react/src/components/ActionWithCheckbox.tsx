import React from "react";
import "./ActionWithCheckbox.css";

interface ActionWithCheckboxProps {
  label: string;
  autoChecked: boolean;
  onAutoChange: (checked: boolean) => void;
  onActionClick: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
}

const ActionWithCheckbox: React.FC<ActionWithCheckboxProps> = ({
  label,
  autoChecked,
  onAutoChange,
  onActionClick,
  actionLabel,
  actionDisabled = false,
}) => {
  return (
    <div className="action-with-checkbox">
      <div className="auto-checkbox">
        <input
          type="checkbox"
          checked={autoChecked}
          onChange={(e) => onAutoChange(e.target.checked)}
          id={`checkbox-${actionLabel}`}
        />
        <label htmlFor={`checkbox-${actionLabel}`}>{label}</label>
      </div>
      <button onClick={onActionClick} disabled={actionDisabled}>
        {actionLabel}
      </button>
    </div>
  );
};

export default ActionWithCheckbox;
