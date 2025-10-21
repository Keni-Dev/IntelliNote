import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { GlassModal, GlassInput, GlassButton } from '../common';

/**
 * NotebookModal - A modal for creating and editing notebooks
 * Features form validation, color picker, and unsaved changes protection
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Object} [props.notebook] - Notebook to edit (null for create mode)
 * @param {Function} props.onSave - Save handler (name, color) => Promise
 * @param {boolean} [props.isSaving] - Loading state while saving
 * @returns {JSX.Element}
 */
const NotebookModal = ({ 
  isOpen, 
  onClose, 
  notebook = null, 
  onSave,
  isSaving = false 
}) => {
  const isEditMode = notebook !== null;

  // Form state
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Preset colors
  const colorPalette = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Lime', value: '#84cc16' },
  ];

  // Initialize form with notebook data in edit mode
  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setName(notebook.name || '');
        setSelectedColor(notebook.color || '#6366f1');
      } else {
        setName('');
        setSelectedColor('#6366f1');
      }
      setErrors({});
      setHasChanges(false);
    }
  }, [isOpen, notebook, isEditMode]);

  // Track changes
  useEffect(() => {
    if (isEditMode && notebook) {
      const changed = 
        name !== notebook.name || 
        selectedColor !== notebook.color;
      setHasChanges(changed);
    } else {
      setHasChanges(name.trim() !== '' || selectedColor !== '#6366f1');
    }
  }, [name, selectedColor, notebook, isEditMode]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Notebook name is required';
    } else if (name.trim().length < 1) {
      newErrors.name = 'Name must be at least 1 character';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }

    // Validate color
    if (!selectedColor) {
      newErrors.color = 'Please select a color';
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
      await onSave(name.trim(), selectedColor);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving notebook:', error);
      setErrors({ submit: 'Failed to save notebook. Please try again.' });
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
      title={isEditMode ? 'Edit Notebook' : 'Create New Notebook'}
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

        {/* Notebook Name Input */}
        <div>
          <label 
            htmlFor="notebook-name"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Notebook Name <span className="text-red-400">*</span>
          </label>
          <GlassInput
            id="notebook-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., My Study Notes"
            autoFocus
            disabled={isSaving}
            className={errors.name ? 'border-red-400/50' : ''}
          />
          {errors.name && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-red-400"
            >
              {errors.name}
            </motion.p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            {name.length}/50 characters
          </p>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Choose Color <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {colorPalette.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                disabled={isSaving}
                className="group relative focus:outline-none"
                title={color.name}
                type="button"
              >
                <motion.div
                  className={`w-full aspect-square rounded-xl transition-all duration-200 ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  whileHover={!isSaving ? { scale: 1.1 } : {}}
                  whileTap={!isSaving ? { scale: 0.95 } : {}}
                >
                  {selectedColor === color.value && (
                    <>
                      {/* Selection ring */}
                      <motion.div
                        className="absolute -inset-1 rounded-xl border-2 border-white"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      />
                      {/* Check icon */}
                      <motion.svg
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="absolute inset-0 w-full h-full text-white p-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </motion.svg>
                    </>
                  )}
                </motion.div>
                {/* Color name on hover */}
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {color.name}
                </span>
              </button>
            ))}
          </div>
          {errors.color && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-red-400"
            >
              {errors.color}
            </motion.p>
          )}
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
            disabled={isSaving || !name.trim()}
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
                    Create
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

NotebookModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  notebook: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    color: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
};

export default NotebookModal;
