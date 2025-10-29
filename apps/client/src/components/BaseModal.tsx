// apps/client/src/components/BaseModal.tsx
// -----------------------------------------------------------------------------
// Base modal component providing consistent modal behavior and styling
// Based on BetModal.tsx styling as the designated style source of truth
// Supports portal rendering, overlay handling, responsive design, and accessibility
// -----------------------------------------------------------------------------

import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ModalVariant = 'default' | 'danger' | 'success' | 'warning';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;

  // Configuration
  size?: ModalSize;
  variant?: ModalVariant;
  className?: string;

  // Header
  title?: string;
  subtitle?: string;
  showCloseButton?: boolean;
  icon?: string;

  // Behavior
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventBodyScroll?: boolean;

  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;

  // Footer actions
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
  }>;

  // Custom elements
  headerContent?: ReactNode;
  footerContent?: ReactNode;
}

export default function BaseModal({
  isOpen,
  onClose,
  children,
  size = 'md',
  variant = 'default',
  className = '',
  title,
  subtitle,
  showCloseButton = true,
  icon,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventBodyScroll = true,
  ariaLabel,
  ariaDescribedBy,
  actions,
  headerContent,
  footerContent,
}: BaseModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle body scroll prevention
  useEffect(() => {
    if (!preventBodyScroll) return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, preventBodyScroll]);

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-[95vw] max-h-[95vh]';
      default:
        return 'max-w-lg';
    }
  };

  // Variant classes for the modal container
  const getVariantClasses = () => {
    switch (variant) {
      case 'danger':
        return 'border-error/30 shadow-error/10';
      case 'success':
        return 'border-success/30 shadow-success/10';
      case 'warning':
        return 'border-warning/30 shadow-warning/10';
      default:
        return 'border-muted';
    }
  };

  // Action button styling
  const getActionButtonClasses = (actionVariant: string = 'secondary') => {
    const baseClasses =
      'px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    switch (actionVariant) {
      case 'primary':
        return `${baseClasses} bg-primary text-surface hover:bg-primary/90`;
      case 'danger':
        return `${baseClasses} bg-error text-surface hover:bg-error/90`;
      default:
        return `${baseClasses} bg-secondary text-content hover:bg-secondary/80`;
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div
        className="fixed inset-0"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        className={`
          relative bg-surface border rounded-2xl shadow-2xl w-full
          ${getSizeClasses()}
          ${getVariantClasses()}
          ${size === 'full' ? 'h-full' : 'max-h-[90vh]'}
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-describedby={ariaDescribedBy}
      >
        {/* Header */}
        {(title || subtitle || headerContent || showCloseButton) && (
          <div className="flex items-start justify-between p-6 border-b border-muted">
            <div className="flex-1">
              {(title || icon) && (
                <h2 className="text-xl font-bold text-content flex items-center mb-2">
                  {icon && <span className="mr-2">{icon}</span>}
                  {title}
                </h2>
              )}
              {subtitle && <p className="text-sm text-tertiary">{subtitle}</p>}
              {headerContent}
            </div>

            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-tertiary hover:text-content text-xl transition-colors ml-4"
                aria-label="Close modal"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className={`
            p-6
            ${size === 'full' ? 'flex-1 overflow-auto' : 'max-h-[calc(90vh-200px)] overflow-auto'}
            ${!(title || subtitle || headerContent || showCloseButton) ? 'pt-6' : ''}
            ${!(actions || footerContent) ? 'pb-6' : ''}
          `}
        >
          {children}
        </div>

        {/* Footer */}
        {(actions || footerContent) && (
          <div className="p-6 border-t border-muted bg-surface/50">
            {footerContent || (
              <div className="flex justify-end space-x-3">
                {actions?.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    className={getActionButtonClasses(action.variant)}
                  >
                    <span className="flex items-center space-x-2">
                      {action.icon && <span>{action.icon}</span>}
                      <span>{action.loading ? 'Loading...' : action.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Convenience modal components for common patterns
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      variant={variant}
      actions={[
        {
          label: cancelLabel,
          onClick: onClose,
          variant: 'secondary',
          disabled: loading,
        },
        {
          label: confirmLabel,
          onClick: onConfirm,
          variant: variant === 'danger' ? 'danger' : 'primary',
          loading,
        },
      ]}
    >
      <p className="text-content">{message}</p>
    </BaseModal>
  );
}

export function AlertModal({
  isOpen,
  onClose,
  title = 'Alert',
  message,
  variant = 'default',
  icon,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  variant?: ModalVariant;
  icon?: string;
}) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      size="sm"
      variant={variant}
      actions={[
        {
          label: 'OK',
          onClick: onClose,
          variant: 'primary',
        },
      ]}
    >
      <p className="text-content">{message}</p>
    </BaseModal>
  );
}

// Hook for modal state management
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
