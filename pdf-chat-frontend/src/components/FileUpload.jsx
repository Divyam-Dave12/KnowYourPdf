import React from "react";
import { FaFileUpload } from "react-icons/fa";

const FileUpload = ({ handleFileChange, isUploading, file }) => {
  return (
    <div className="file-upload-section">
      <label htmlFor="file-upload" className="upload-btn">
        <FaFileUpload /> {isUploading ? "Processing..." : "Upload New PDF"}
      </label>
      <input
        id="file-upload"
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={isUploading}
        style={{ display: "none" }}
      />
      {file && <p className="file-name">{file.name}</p>}
    </div>
  );
};

export default FileUpload;