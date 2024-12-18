import React from 'react';

interface ErrorBannerProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function ErrorBanner({ message, action }: ErrorBannerProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="rounded-lg bg-red-500 bg-opacity-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-400">{message}</p>
            </div>
          </div>
          {action && (
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={action.onClick}
                className="bg-red-500 bg-opacity-20 hover:bg-opacity-30 rounded-md px-3 py-1 text-sm font-medium text-red-400 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-all duration-200"
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 