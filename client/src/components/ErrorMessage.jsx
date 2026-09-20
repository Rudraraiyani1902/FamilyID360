import React from 'react';

/**
 * Standard ErrorMessage component for FamilyID 360.
 * Supports:
 * - Direct strings, Error objects, Axios errors, or objects with { message, errors }
 * - Inline banner mode (default) with dismiss (onClose) and retry (onRetry)
 * - Page-level centered mode (variant="page")
 */
export default function ErrorMessage({
  message,
  error,
  title,
  onClose,
  onRetry,
  variant = 'banner',
  className = '',
}) {
  const raw = message || error;
  if (!raw) return null;

  // Extract human-readable error text and sub-errors
  let titleText = title;
  let descriptionText = '';
  let subErrors = [];

  if (typeof raw === 'string') {
    descriptionText = raw;
  } else if (raw instanceof Error) {
    descriptionText = raw.clientMessage || raw.message || 'An unexpected error occurred.';
  } else if (typeof raw === 'object') {
    if (raw.clientMessage) {
      descriptionText = raw.clientMessage;
    } else if (raw.message) {
      descriptionText = raw.message;
    } else if (raw.error) {
      descriptionText = typeof raw.error === 'string' ? raw.error : JSON.stringify(raw.error);
    } else {
      descriptionText = 'An unexpected error occurred.';
    }

    // Check for nested validation error lists
    if (Array.isArray(raw.errors)) {
      subErrors = raw.errors.map((e) => (typeof e === 'string' ? e : e.msg || e.message || JSON.stringify(e)));
    }
  }

  // Full-page centered variant (when an entire route fails to load)
  if (variant === 'page') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 py-16 px-4 text-center ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-sm">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="max-w-md">
          <h3 className="text-base font-bold text-gray-900">{titleText || 'Unable to Load Information'}</h3>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{descriptionText}</p>
          {subErrors.length > 0 && (
            <ul className="mt-2.5 text-xs text-left text-red-700 bg-red-50/70 p-3 rounded-lg border border-red-100 space-y-1">
              {subErrors.map((err, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary text-xs py-2 px-4 shadow-sm inline-flex items-center gap-1.5"
          >
            <span>↻</span>
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  // Default Banner Variant: sleek, compact, dismissible alert banner
  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-200/90 bg-red-50/90 p-4 shadow-sm text-red-900 transition-all ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Error Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mt-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {titleText && (
            <h4 className="text-xs font-bold text-red-950 uppercase tracking-wide mb-0.5">
              {titleText}
            </h4>
          )}
          <p className="text-xs sm:text-sm font-medium text-red-800 leading-snug">
            {descriptionText}
          </p>

          {/* Sub-errors / field validation list */}
          {subErrors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-red-700 bg-red-100/50 p-2.5 rounded-lg border border-red-200/60">
              {subErrors.map((err, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Action button if retry provided */}
          {onRetry && (
            <div className="mt-2.5">
              <button
                onClick={onRetry}
                type="button"
                className="text-xs font-semibold text-red-900 bg-red-100 hover:bg-red-200 border border-red-300 px-3 py-1.5 rounded-lg transition"
              >
                Retry action
              </button>
            </div>
          )}
        </div>

        {/* Close / Dismiss Button */}
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            aria-label="Dismiss error"
            className="flex-shrink-0 text-red-500 hover:text-red-800 hover:bg-red-100 p-1 rounded-md transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
