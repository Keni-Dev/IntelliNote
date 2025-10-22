import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';

/**
 * ColorPicker - A dropdown color picker with preset colors and custom color input
 * 
 * @param {Object} props
 * @param {string} props.selectedColor - Currently selected color
 * @param {Function} props.onColorChange - Callback when color changes
 * @param {boolean} props.isOpen - Whether the picker is open
 * @param {Function} props.onClose - Callback to close the picker
 * @returns {JSX.Element}
 */
const ColorPicker = ({ selectedColor, onColorChange, isOpen, onClose }) => {
  const pickerRef = useRef(null);
  const [recentColors, setRecentColors] = useState([]);

  // Preset colors in a 2x4 grid
  const presetColors = [
    '#000000', // Black
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
  ];

  // Load recent colors from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('intellinote-recent-colors');
    if (stored) {
      try {
        setRecentColors(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading recent colors:', error);
      }
    }
  }, []);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Handle color selection
  const handleColorSelect = (color) => {
    onColorChange(color);
    addToRecentColors(color);
  };

  // Add color to recent colors
  const addToRecentColors = (color) => {
    const updated = [color, ...recentColors.filter(c => c !== color)].slice(0, 5);
    setRecentColors(updated);
    localStorage.setItem('intellinote-recent-colors', JSON.stringify(updated));
  };

  // Handle custom color input
  const handleCustomColorChange = (event) => {
    const color = event.target.value;
    handleColorSelect(color);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className={cn(
        'absolute left-full ml-2 top-0',
        'backdrop-blur-xl bg-white/10 border border-white/20',
        'rounded-xl p-4 shadow-xl',
        'z-50',
        'animate-in fade-in slide-in-from-left-2 duration-200'
      )}
    >
      {/* Preset Colors */}
      <div className="mb-3">
        <p className="text-xs text-white/70 font-medium mb-2">Preset Colors</p>
        <div className="grid grid-cols-4 gap-2">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={cn(
                'w-8 h-8 rounded-lg',
                'border-2 transition-all duration-200',
                'hover:scale-110 hover:shadow-lg',
                selectedColor === color
                  ? 'border-white shadow-lg scale-110'
                  : 'border-white/20 hover:border-white/40'
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Custom Color */}
      <div className="mb-3">
        <p className="text-xs text-white/70 font-medium mb-2">Custom Color</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={selectedColor}
            onChange={handleCustomColorChange}
            className={cn(
              'w-full h-10 rounded-lg cursor-pointer',
              'border-2 border-white/20',
              'bg-transparent'
            )}
          />
          <div
            className="w-10 h-10 rounded-lg border-2 border-white/20"
            style={{ backgroundColor: selectedColor }}
          />
        </div>
      </div>

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div>
          <p className="text-xs text-white/70 font-medium mb-2">Recent Colors</p>
          <div className="flex gap-2">
            {recentColors.map((color, index) => (
              <button
                key={`${color}-${index}`}
                onClick={() => handleColorSelect(color)}
                className={cn(
                  'w-8 h-8 rounded-lg',
                  'border-2 transition-all duration-200',
                  'hover:scale-110 hover:shadow-lg',
                  selectedColor === color
                    ? 'border-white shadow-lg scale-110'
                    : 'border-white/20 hover:border-white/40'
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

ColorPicker.propTypes = {
  selectedColor: PropTypes.string.isRequired,
  onColorChange: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ColorPicker;
