import React from "react";
import PropTypes from "prop-types";
import { Send } from '@mui/icons-material';

const SubmitButton = ({ isLoading, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all duration-200
        flex items-center justify-center
        ${
          disabled || isLoading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        }
        transform hover:-translate-y-0.5
        shadow-lg hover:shadow-xl
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
      `}
      aria-label={isLoading ? "Submitting..." : "Submit message"}
      aria-disabled={disabled || isLoading}
    >
      <div className="flex items-center justify-center">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <Send sx={{ 
            fontSize: 24, 
            transform: 'rotate(-45deg)',
            color: '#ffffff'  
          }} />
          
        )}
      </div>
    </button>
  );
};

const LoadingSpinner = () => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);
SubmitButton.propTypes = {
  isLoading: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

SubmitButton.defaultProps = {
  isLoading: false,
  disabled: false,
};

export default SubmitButton;
