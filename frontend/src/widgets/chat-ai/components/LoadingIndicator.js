import React from "react";
import PropTypes from "prop-types";

// PUBLIC_INTERFACE
const LoadingIndicator = ({ size = "md", variant = "primary", text = "" }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const variantClasses = {
    primary: "bg-gradient-to-r from-blue-500 to-indigo-600",
    secondary: "bg-gradient-to-r from-gray-500 to-gray-600",
    success: "bg-gradient-to-r from-green-500 to-emerald-600",
    error: "bg-gradient-to-r from-red-500 to-rose-600",
  };

  return (
    <div
      role="status"
      className="flex items-center justify-center transition-opacity duration-300 ease-in-out"
    >
      <div
        className={`
          ${sizeClasses[size] || sizeClasses.md}
          ${variantClasses[variant] || variantClasses.primary}
          animate-spin
          animate-loadingPulse
          rounded-full
          shadow-lg
          transition-all
          duration-300
          ease-in-out
          opacity-90
          hover:opacity-100
          hover:shadow-xl
        `}
        aria-label="Loading"
      >
        <div className="w-full h-full rounded-full bg-white/30" />
      </div>
      {text && (
        <span
          className="ml-3 text-gray-700 animate-fadeIn font-medium"
          aria-live="polite"
        >
          {text}
        </span>
      )}
    </div>
  );
};

LoadingIndicator.propTypes = {
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  variant: PropTypes.oneOf(["primary", "secondary", "success", "error"]),
  text: PropTypes.string,
};

export default LoadingIndicator;
