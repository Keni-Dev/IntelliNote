import React from 'react';

/**
 * OCRDebugPreview - Shows the OCR image being sent to the server
 * Only visible when VITE_DEBUG=true in .env
 */
const OCRDebugPreview = ({ imageData, debugInfo }) => {
  const isDebugMode = import.meta.env.VITE_DEBUG === 'true';

  if (!isDebugMode || !imageData) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-white rounded-lg shadow-2xl border-2 border-red-500 overflow-hidden max-w-md">
      {/* Header */}
      <div className="bg-red-500 text-white px-3 py-2 font-mono text-xs font-bold">
        🔍 DEBUG: OCR Image Preview
      </div>

      {/* Image Preview */}
      <div className="p-3 bg-gray-50">
        <img 
          src={imageData} 
          alt="OCR Debug Preview" 
          className="w-full border border-gray-300 rounded"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div className="px-3 py-2 bg-gray-100 border-t border-gray-300">
          <div className="font-mono text-[10px] space-y-1 text-gray-700">
            <div className="font-bold text-red-600">Coordinates (Canvas Space):</div>
            <div>• TL: {debugInfo.corners?.TL}</div>
            <div>• TR: {debugInfo.corners?.TR}</div>
            <div>• BL: {debugInfo.corners?.BL}</div>
            <div>• BR: {debugInfo.corners?.BR}</div>
            <div className="pt-1 border-t border-gray-300 mt-1">
              <span className="font-bold text-red-600">Size:</span> {debugInfo.size}
            </div>
            <div>
              <span className="font-bold text-red-600">Zoom:</span> {debugInfo.zoom}x
            </div>
            <div>
              <span className="font-bold text-red-600">Pan:</span> {debugInfo.pan}
            </div>
            <div>
              <span className="font-bold text-red-600">Strokes:</span> {debugInfo.strokesRendered}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRDebugPreview;
