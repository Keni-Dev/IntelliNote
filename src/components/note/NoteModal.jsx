import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { GlassModal, GlassInput, GlassButton } from '../common';
import { NOTE_TYPE_INFO } from '../../lib/smartMathSolver';

/**
 * NoteModal - A modal for creating and editing notes
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Object} [props.note] - Note to edit (null for create mode)
 * @param {Function} props.onSave - Save handler (title, noteType) => Promise
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
  const [noteType, setNoteType] = useState('auto');
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with note data in edit mode
  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setTitle(note.title || '');
        setNoteType(note.noteType || 'auto');
      } else {
        setTitle('');
        setNoteType('auto');
      }
      setErrors({});
      setHasChanges(false);
    }
  }, [isOpen, note, isEditMode]);

  // Track changes
  useEffect(() => {
    if (isEditMode && note) {
      setHasChanges(title !== note.title || noteType !== (note.noteType || 'auto'));
    } else {
      setHasChanges(title.trim() !== '' || noteType !== 'auto');
    }
  }, [title, noteType, note, isEditMode]);

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
      await onSave(finalTitle, noteType);
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

        {/* Note Type Selection */}
        <div>
          <label 
            htmlFor="note-type"
            className="block text-sm font-medium text-text-secondary mb-3"
          >
            Note Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(NOTE_TYPE_INFO).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setNoteType(key)}
                disabled={isSaving}
                className={`
                  relative p-3 rounded-xl border transition-all duration-200
                  ${noteType === key 
                    ? 'border-indigo-400/50 bg-indigo-500/20' 
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                style={{
                  borderColor: noteType === key ? `${info.color}80` : undefined,
                  backgroundColor: noteType === key ? `${info.color}20` : undefined
                }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl" role="img" aria-label={info.label}>
                    {info.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm text-text-primary">
                      {info.label.replace(/^[^\s]+\s/, '')}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {info.description}
                    </div>
                  </div>
                </div>
                {noteType === key && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2"
                  >
                    <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {NOTE_TYPE_INFO[noteType]?.description}
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
