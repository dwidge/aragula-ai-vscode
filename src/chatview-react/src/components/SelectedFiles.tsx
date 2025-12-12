import React from "react";
import "./SelectedFiles.css";

interface SelectedFilesProps {
  files: string[];
  onRemoveFile: (file: string) => void;
  onClearAll?: () => void;
}

const SelectedFiles: React.FC<SelectedFilesProps> = ({
  files,
  onRemoveFile,
  onClearAll,
}) => (
  <div id="selected-files-container">
    {files.map((filePath) => (
      <div key={filePath} className="file-button">
        {filePath}
        <button
          className="remove-file-button"
          onClick={() => onRemoveFile(filePath)}
          aria-label={`Remove ${filePath}`}
        >
          ✕
        </button>
      </div>
    ))}
    {files.length > 0 && onClearAll && (
      <button
        className="clear-all-button"
        onClick={onClearAll}
        aria-label="Clear all selected files"
      >
        Clear all
      </button>
    )}
  </div>
);

export default SelectedFiles;
