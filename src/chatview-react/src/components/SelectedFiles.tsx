import React from 'react';
import './SelectedFiles.css';

interface SelectedFilesProps {
  files: string[];
  onRemoveFile: (file: string) => void;
}

const SelectedFiles: React.FC<SelectedFilesProps> = ({ files, onRemoveFile }) => (
  <div id="selected-files-container">
    {files.map((filePath) => (
      <div key={filePath} className="file-button">
        {filePath}
        <button className="remove-file-button" onClick={() => onRemoveFile(filePath)}>
          ✕
        </button>
      </div>
    ))}
  </div>
);

export default SelectedFiles;
