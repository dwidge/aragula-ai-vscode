import React from "react";
import "./SelectedFiles.css";

interface SelectedFilesProps {
  files: string[];
  groupIndex?: number;
  onRemoveFile: (file: string) => void;
  onClearAll?: () => void;
  onFilter?: () => void;
}

const SelectedFiles: React.FC<SelectedFilesProps> = ({
  files,
  groupIndex,
  onRemoveFile,
  onClearAll,
  onFilter,
}) => (
  <div className="selected-files-container">
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
    {files.length > 0 && (
      <>
        {onClearAll && (
          <button
            className="clear-all-button"
            onClick={onClearAll}
            aria-label="Clear all selected files"
          >
            Clear all
          </button>
        )}
        {onFilter && (
          <button
            className="filter-button"
            onClick={onFilter}
            aria-label="Filter relevant files using current prompt"
          >
            Filter
          </button>
        )}
      </>
    )}
  </div>
);

export default SelectedFiles;
