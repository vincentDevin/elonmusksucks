import React from 'react';
import type { RuleValidationResult } from '@ems/types';

interface ValidationFeedbackProps {
  validation: RuleValidationResult;
  isValidating?: boolean;
  compact?: boolean;
  showDetails?: boolean;
}

export const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  validation,
  isValidating = false,
  compact = false,
  showDetails = true,
}) => {
  const getStatusIcon = () => {
    if (isValidating) {
      return (
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
      );
    }

    if (validation.isValid) {
      return (
        <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const getStatusText = () => {
    if (isValidating) return 'Validating...';
    return validation.isValid ? 'Valid' : 'Invalid';
  };

  const getStatusColor = () => {
    if (isValidating) return 'text-primary';
    return validation.isValid ? 'text-success' : 'text-error';
  };

  const getComplexityBadge = () => {
    const { estimatedComplexity } = validation;
    const colors = {
      low: 'bg-success/20 text-success',
      medium: 'bg-warning/20 text-warning',
      high: 'bg-error/20 text-error',
    };

    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🔴',
    };

    return (
      <div
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${colors[estimatedComplexity]}`}
      >
        <span>{icons[estimatedComplexity]}</span>
        <span>{estimatedComplexity} complexity</span>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>{getStatusText()}</span>
        {validation.isValid && getComplexityBadge()}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border-l-4 p-4 ${
        isValidating
          ? 'bg-primary/5 border-l-primary'
          : validation.isValid
            ? 'bg-success/10 border-l-success'
            : 'bg-error/10 border-l-error'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h4 className={`font-medium ${getStatusColor()}`}>{getStatusText()}</h4>
        </div>
        {validation.isValid && !isValidating && getComplexityBadge()}
      </div>

      {/* Content */}
      {showDetails && !isValidating && (
        <div className="space-y-3">
          {/* Errors */}
          {validation.errors.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-error mb-2 flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Errors ({validation.errors.length})</span>
              </h5>
              <ul className="space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-error">
                    <span className="mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-warning mb-2 flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Warnings ({validation.warnings.length})</span>
              </h5>
              <ul className="space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-warning">
                    <span className="mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success message */}
          {validation.isValid &&
            validation.errors.length === 0 &&
            validation.warnings.length === 0 && (
              <div className="flex items-center space-x-2 text-sm text-success">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Rule is valid and ready to use!</span>
              </div>
            )}
        </div>
      )}

      {/* Loading state */}
      {isValidating && (
        <div className="flex items-center space-x-2 text-sm text-primary">
          <span>Checking rule structure, event keys, and performance impact...</span>
        </div>
      )}
    </div>
  );
};

interface InlineValidationProps {
  isValid?: boolean;
  message?: string;
  type?: 'error' | 'warning' | 'success';
}

export const InlineValidation: React.FC<InlineValidationProps> = ({
  isValid,
  message,
  type = 'error',
}) => {
  if (!message) return null;

  const colors = {
    error: 'text-error',
    warning: 'text-warning',
    success: 'text-success',
  };

  const icons = {
    error: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warning: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    success: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <div className={`flex items-center space-x-1 text-xs ${colors[type]} mt-1`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
};

interface FieldValidationProps {
  field: string;
  value: unknown;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array';
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => string | null;
}

export const FieldValidation: React.FC<FieldValidationProps> = ({
  field,
  value,
  required = false,
  type = 'string',
  min,
  max,
  pattern,
  customValidator,
}) => {
  const validateField = (): {
    isValid: boolean;
    message?: string;
    type: 'error' | 'warning' | 'success';
  } => {
    // Required check
    if (required && (value === undefined || value === null || value === '')) {
      return { isValid: false, message: `${field} is required`, type: 'error' };
    }

    // Skip other validations if not required and empty
    if (!required && (value === undefined || value === null || value === '')) {
      return { isValid: true, type: 'success' };
    }

    // Type validation
    switch (type) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return { isValid: false, message: `${field} must be a number`, type: 'error' };
        }
        const numValue = Number(value);
        if (min !== undefined && numValue < min) {
          return { isValid: false, message: `${field} must be at least ${min}`, type: 'error' };
        }
        if (max !== undefined && numValue > max) {
          return { isValid: false, message: `${field} must be at most ${max}`, type: 'error' };
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          return { isValid: false, message: `${field} must be a string`, type: 'error' };
        }
        if (min !== undefined && value.length < min) {
          return {
            isValid: false,
            message: `${field} must be at least ${min} characters`,
            type: 'error',
          };
        }
        if (max !== undefined && value.length > max) {
          return {
            isValid: false,
            message: `${field} must be at most ${max} characters`,
            type: 'error',
          };
        }
        if (pattern && !pattern.test(value)) {
          return { isValid: false, message: `${field} format is invalid`, type: 'error' };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { isValid: false, message: `${field} must be true or false`, type: 'error' };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return { isValid: false, message: `${field} must be an array`, type: 'error' };
        }
        if (min !== undefined && value.length < min) {
          return {
            isValid: false,
            message: `${field} must have at least ${min} items`,
            type: 'error',
          };
        }
        if (max !== undefined && value.length > max) {
          return {
            isValid: false,
            message: `${field} must have at most ${max} items`,
            type: 'error',
          };
        }
        break;
    }

    // Custom validation
    if (customValidator) {
      const customError = customValidator(value);
      if (customError) {
        return { isValid: false, message: customError, type: 'error' };
      }
    }

    return { isValid: true, type: 'success' };
  };

  const validation = validateField();

  return (
    <InlineValidation
      isValid={validation.isValid}
      message={validation.message}
      type={validation.type}
    />
  );
};

interface ProgressIndicatorProps {
  steps: Array<{
    label: string;
    completed: boolean;
    hasError?: boolean;
    hasWarning?: boolean;
  }>;
  currentStep?: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center space-x-2 mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex items-center space-x-2">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                step.hasError
                  ? 'bg-error text-white'
                  : step.hasWarning
                    ? 'bg-warning text-white'
                    : step.completed
                      ? 'bg-success text-white'
                      : currentStep === index
                        ? 'bg-primary text-white'
                        : 'bg-muted text-tertiary'
              }`}
            >
              {step.hasError ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : step.completed ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-sm ${
                step.hasError
                  ? 'text-error'
                  : step.hasWarning
                    ? 'text-warning'
                    : step.completed
                      ? 'text-success'
                      : currentStep === index
                        ? 'text-primary font-medium'
                        : 'text-tertiary'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-px flex-1 ${steps[index + 1].completed ? 'bg-success' : 'bg-muted'}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
