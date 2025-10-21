import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { GlassModal, GlassInput, GlassButton } from '../common';

/**
 * NoteModal - A modal for creating and editing notes
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Object} [props.note] - Note to edit (null for create mode)
 * @param {Function} props.onSave - Save handler (title) => Promise
 * @param {boolean} [props.isSaving] - Loading state while saving
 * @returns {JSX.Element}
 */
const NoteModal = ({ 
  isOpen, 
  onClose, 
  note = null, 
  onSave,
  isSaving = false 
}) => {
  const isEditMode = note !== null;

  // Form state
  const [title, setTitle] = useState('');
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with note data in edit mode
  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setTitle(note.title || '');
      } else {
        setTitle('');
      }
      setErrors({});
      setHasChanges(false);
    }
  }, [isOpen, note, isEditMode]);

  // Track changes
  useEffect(() => {
    if (isEditMode && note) {
      setHasChanges(title !== note.title);
    } else {
      setHasChanges(title.trim() !== '');
    }
  }, [title, note, isEditMode]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Title can be empty - will default to "Untitled Note"
    if (title.trim().length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Use "Untitled Note" if title is empty
      const finalTitle = title.trim() || 'Untitled Note';
      await onSave(finalTitle);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving note:', error);
      setErrors({ submit: 'Failed to save note. Please try again.' });
    }
  };

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasChanges && !isSaving) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) {
        return;
      }
    }
    onClose();
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit Note' : 'Create New Note'}
    >
      <div className="space-y-6">
        {/* Submit Error */}
        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-100"
          >
            <div className="flex items-start gap-3">
              <svg 
                className="w-5 h-5 flex-shrink-0 mt-0.5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <p className="text-sm">{errors.submit}</p>
            </div>
          </motion.div>
        )}

        {/* Note Title Input */}
        <div>
          <label 
            htmlFor="note-title"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Note Title
          </label>
          <GlassInput
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Untitled Note"
            autoFocus
            disabled={isSaving}
            className={errors.title ? 'border-red-400/50' : ''}
          />
          {errors.title && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-red-400"
            >
              {errors.title}
            </motion.p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            {title.length}/100 characters • Leave empty for "Untitled Note"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <GlassButton
            variant="secondary"
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </GlassButton>
          <GlassButton
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {isEditMode ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Update
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create & Open
                  </>
                )}
              </span>
            )}
          </GlassButton>
        </div>

        {/* Unsaved changes indicator */}
        {hasChanges && !isSaving && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-center text-amber-400"
          >
            You have unsaved changes
          </motion.p>
        )}
      </div>
    </GlassModal>
  );
};

NoteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  note: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
};

export default NoteModal;
