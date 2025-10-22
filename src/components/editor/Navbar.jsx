import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ArrowLeft, Check, Clock, AlertCircle, ZoomIn } from 'lucide-react';

/**
 * Editor navigation bar component
 * @param {string} notebookId - The notebook ID
 * @param {string} noteTitle - The current note title
 * @param {string} saveStatus - Save status: 'saved' | 'saving' | 'unsaved' | 'error'
 * @param {Function} onTitleChange - Callback when title changes
 * @param {number} zoom - Current zoom level (1 = 100%)
 * @param {Function} onZoomChange - Callback when zoom changes
 */
const Navbar = ({ notebookId, noteTitle, saveStatus, onTitleChange, zoom, onZoomChange }) => {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(noteTitle);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const inputRef = useRef(null);
  const zoomMenuRef = useRef(null);

  const zoomPresets = [50, 75, 100, 150, 200];

  useEffect(() => {
    setEditedTitle(noteTitle);
  }, [noteTitle]);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  // Close zoom menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(event.target)) {
        setIsZoomMenuOpen(false);
      }
    };

    if (isZoomMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isZoomMenuOpen]);

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (editedTitle.trim() !== noteTitle) {
      onTitleChange(editedTitle.trim() || 'Untitled Note');
    } else {
      setEditedTitle(noteTitle);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setEditedTitle(noteTitle);
      setIsEditingTitle(false);
    }
  };

  const handleBackClick = () => {
    navigate(`/notebook/${notebookId}`);
  };

  const handleZoomClick = () => {
    setIsZoomMenuOpen(!isZoomMenuOpen);
  };

  const handleZoomPreset = (percentage) => {
    const zoomLevel = percentage / 100;
    onZoomChange(zoomLevel);
    setIsZoomMenuOpen(false);
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saved':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'saving':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saved':
        return 'Saved';
      case 'saving':
        return 'Saving...';
      case 'error':
        return 'Error saving';
      default:
        return 'Unsaved';
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left side - Back button */}
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Notes</span>
        </button>

        {/* Center - Note title */}
        <div className="flex-1 flex justify-center mx-4">
          {isEditingTitle ? (
            <input
              ref={inputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="text-xl font-semibold text-gray-800 bg-transparent border-b-2 border-blue-500 px-2 py-1 outline-none text-center max-w-md"
              maxLength={100}
            />
          ) : (
            <button
              onClick={handleTitleClick}
              className="text-xl font-semibold text-gray-800 hover:text-blue-600 px-2 py-1 rounded transition-colors cursor-text"
            >
              {noteTitle}
            </button>
          )}
        </div>

        {/* Right side - Zoom indicator and Save status */}
        <div className="flex items-center gap-3">
          {/* Zoom Indicator */}
          <div className="relative" ref={zoomMenuRef}>
            <button
              onClick={handleZoomClick}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {Math.round(zoom * 100)}%
              </span>
            </button>

            {/* Zoom Menu */}
            {isZoomMenuOpen && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-50">
                {zoomPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleZoomPreset(preset)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                      Math.round(zoom * 100) === preset
                        ? 'text-blue-600 font-medium bg-blue-50'
                        : 'text-gray-700'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            {getSaveStatusIcon()}
            <span className={`text-sm font-medium ${
              saveStatus === 'saved' ? 'text-green-600' :
              saveStatus === 'saving' ? 'text-blue-600' :
              saveStatus === 'error' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {getSaveStatusText()}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  notebookId: PropTypes.string.isRequired,
  noteTitle: PropTypes.string.isRequired,
  saveStatus: PropTypes.oneOf(['saved', 'saving', 'unsaved', 'error']).isRequired,
  onTitleChange: PropTypes.func.isRequired,
  zoom: PropTypes.number,
  onZoomChange: PropTypes.func,
};

Navbar.defaultProps = {
  zoom: 1,
  onZoomChange: () => {},
};

export default Navbar;
