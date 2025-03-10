import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { CloudUpload } from '@mui/icons-material';
import { Alert, Snackbar } from '@mui/material';

const ACCEPTED_FILE_TYPES = {
  pdf: [".pdf"],
  word: [".doc", ".docx"],
  excel: [".xls", ".xlsx"],
  powerpoint: [".ppt", ".pptx"],
  text: [".txt"],
  csv: [".csv"]
};

const ACCEPTED_FILE_EXTENSIONS = Object.values(ACCEPTED_FILE_TYPES)
  .flat()
  .join(",");

const FileUploadButton = ({
  onFileSelect,
  disabled = false,
}) => {
  const [error, setError] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const FILE_SIZE_LIMITS = {
    pdf: 100 * 1024 * 1024,    
    docx: 100 * 1024 * 1024,   
    doc: 100 * 1024 * 1024,    
    ppt: 50 * 1024 * 1024,     
    pptx: 50 * 1024 * 1024,    
    csv: 5 * 1024 * 1024,      
    xls: 15 * 1024 * 1024,     
    xlsx: 15 * 1024 * 1024,    
    txt: 100 * 1024 * 1024     
  };

  const validateFile = (file) => {
    if (!file) return "Please select a file";

    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidExtension = Object.values(ACCEPTED_FILE_TYPES)
      .flat()
      .some(ext => ext.toLowerCase().includes(fileExtension));

    if (!isValidExtension) {
      setOpenSnackbar(true);
      return `Invalid file type. Accepted types: PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), Text (TXT), CSV`;
    }

    const sizeLimit = FILE_SIZE_LIMITS[fileExtension];
    if (file.size > sizeLimit) {
      setOpenSnackbar(true);
      return `File size exceeds ${Math.round(sizeLimit / 1024 / 1024)}MB limit for ${fileExtension.toUpperCase()} files`;
    }

    return "";
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    const validationError = validateFile(file);

    setError(validationError);

    if (!validationError && file) {
      onFileSelect(file);
    }

    // Reset input value to allow selecting the same file again
    event.target.value = "";
  };

  return (
    <div className="flex flex-col items-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={ACCEPTED_FILE_EXTENSIONS}
        className="hidden"
        disabled={disabled}
      />
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm
          flex items-center gap-2
          ${disabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800"
          }
          transition-all duration-200
          shadow-lg hover:shadow-xl
          transform hover:-translate-y-0.5
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        `}
        aria-label="Upload file"
      >
        <CloudUpload sx={{ fontSize: 24 }} />
      </button>
      
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </div>
  );
};

FileUploadButton.propTypes = {
  onFileSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
export default FileUploadButton;