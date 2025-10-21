import PropTypes from 'prop-types';
import GlassModal from './GlassModal';
import GlassButton from './GlassButton';

/**
 * ConfirmDialog - A confirmation dialog for destructive actions
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls dialog visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onConfirm - Confirm action handler
 * @param {string} [props.title='Confirm Action'] - Dialog title
 * @param {string} [props.message] - Confirmation message
 * @param {string} [props.confirmText='Confirm'] - Confirm button text
 * @param {string} [props.cancelText='Cancel'] - Cancel button text
 * @param {boolean} [props.isLoading=false] - Loading state
 * @param {'danger' | 'primary'} [props.variant='danger'] - Button variant for confirm
 * @returns {JSX.Element}
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'danger'
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
      // Don't close dialog on error - let parent handle it
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className="max-w-md"
    >
      <div className="space-y-6">
        {/* Warning Icon */}
        <div className="flex items-center gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
            variant === 'danger' 
              ? 'bg-red-500/20 text-red-400' 
              : 'bg-indigo-500/20 text-indigo-400'
          }`}>
            <svg 
              className="w-6 h-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-text-primary text-base">
              {message}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        {variant === 'danger' && (
          <p className="text-sm text-text-muted">
            This action cannot be undone.
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <GlassButton
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </GlassButton>
          <GlassButton
            variant={variant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
};

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  isLoading: PropTypes.bool,
  variant: PropTypes.oneOf(['danger', 'primary']),
};

export default ConfirmDialog;
