/**
 * Example usage of RecognitionResult and CorrectionModal components
 * This demonstrates the complete OCR recognition and correction flow
 */

import React, { useState } from 'react';
import { RecognitionResult, CorrectionModal } from '../components/math';
import { improveConfidence, getSuggestions } from '../lib/ocrLearning';

const RecognitionFlowExample = () => {
  const [showRecognitionResult, setShowRecognitionResult] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [recognitionData, setRecognitionData] = useState(null);

  // Simulate OCR recognition
  const simulateOCR = () => {
    // Example: User drew "sin(x) + 2x"
    const exampleStrokes = [
      {
        points: [
          { x: 100, y: 100 },
          { x: 120, y: 100 },
          { x: 140, y: 100 }
        ]
      },
      {
        points: [
          { x: 150, y: 90 },
          { x: 150, y: 110 }
        ]
      }
    ];

    // Simulate OCR result with varying confidence
    const rawResult = {
      text: '\\sin(x) + 2x',
      confidence: 0.85, // High confidence
      alternatives: ['\\sinh(x) + 2x', 's\\text{in}(x) + 2x']
    };

    // Improve confidence based on learning history
    const improvedResult = improveConfidence(rawResult, exampleStrokes);

    setRecognitionData({
      recognizedText: improvedResult.text,
      confidence: improvedResult.confidence,
      alternatives: improvedResult.alternatives || [],
      originalStrokes: exampleStrokes,
      position: { x: 300, y: 200 }
    });

    setShowRecognitionResult(true);
  };

  // Simulate low confidence OCR
  const simulateLowConfidenceOCR = () => {
    const exampleStrokes = [
      {
        points: [
          { x: 100, y: 100 },
          { x: 120, y: 100 }
        ]
      }
    ];

    const rawResult = {
      text: 'sn(x)', // Likely meant sin(x)
      confidence: 0.35, // Low confidence
      alternatives: ['\\sin(x)', 's_n(x)']
    };

    const improvedResult = improveConfidence(rawResult, exampleStrokes);

    setRecognitionData({
      recognizedText: improvedResult.text,
      confidence: improvedResult.confidence,
      alternatives: improvedResult.alternatives || [],
      originalStrokes: exampleStrokes,
      position: { x: 300, y: 200 }
    });

    setShowRecognitionResult(true);
  };

  // Handle user accepting recognition
  const handleAccept = (acceptedText) => {
    console.log('✓ User accepted:', acceptedText);
    
    // In real app: Convert to MathInput component
    alert(`Converting "${acceptedText}" to MathInput component`);
    
    setShowRecognitionResult(false);
    setRecognitionData(null);
  };

  // Handle user rejecting recognition
  const handleReject = () => {
    console.log('✗ User rejected recognition');
    
    // In real app: Keep as handwriting
    alert('Keeping as handwriting (no conversion)');
    
    setShowRecognitionResult(false);
    setRecognitionData(null);
  };

  // Handle user wanting to edit
  const handleEdit = (textToEdit) => {
    console.log('✎ User editing:', textToEdit);
    setShowRecognitionResult(false);
    setShowCorrectionModal(true);
  };

  // Handle saving corrected text
  const handleSaveCorrection = (correctedText) => {
    console.log('💾 Correction saved:', correctedText);
    console.log('Original was:', recognitionData.recognizedText);
    
    // In real app: Convert to MathInput with corrected text
    alert(`Converting corrected text "${correctedText}" to MathInput`);
    
    setShowCorrectionModal(false);
    setRecognitionData(null);
  };

  // Demo learning system
  const demoLearningSuggestions = () => {
    const examples = [
      'sn(x)',
      'cs(theta)',
      'log(10)',
      'alpha',
      'x * y',
      '0 != 1'
    ];

    console.group('🧠 Learning System Suggestions Demo');
    examples.forEach(text => {
      const suggestions = getSuggestions(text);
      console.log(`\nFor "${text}":`);
      suggestions.forEach(s => {
        console.log(`  → ${s.text} (${s.reason})`);
      });
    });
    console.groupEnd();

    alert('Check console for learning system suggestions demo');
  };

  return (
    <div className="p-8 min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">OCR Recognition Flow Demo</h1>
          <p className="text-gray-400">
            Test the RecognitionResult and CorrectionModal components
          </p>
        </div>

        {/* Demo Controls */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/10 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Simulate Recognition</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={simulateOCR}
              className="px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg border border-green-500/50 transition-colors"
            >
              High Confidence Recognition
              <div className="text-xs text-gray-400 mt-1">
                Simulate recognizing "sin(x) + 2x" with 85% confidence
              </div>
            </button>

            <button
              onClick={simulateLowConfidenceOCR}
              className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/50 transition-colors"
            >
              Low Confidence Recognition
              <div className="text-xs text-gray-400 mt-1">
                Simulate recognizing "sn(x)" with 35% confidence
              </div>
            </button>

            <button
              onClick={demoLearningSuggestions}
              className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg border border-blue-500/50 transition-colors"
            >
              Demo Learning Suggestions
              <div className="text-xs text-gray-400 mt-1">
                Show intelligent correction suggestions
              </div>
            </button>

            <button
              onClick={() => {
                if (recognitionData) {
                  setShowCorrectionModal(true);
                } else {
                  alert('Please simulate a recognition first');
                }
              }}
              className="px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg border border-purple-500/50 transition-colors"
            >
              Open Correction Modal
              <div className="text-xs text-gray-400 mt-1">
                Test manual correction interface
              </div>
            </button>
          </div>
        </div>

        {/* Usage Guide */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/10 space-y-4">
          <h2 className="text-xl font-semibold mb-4">User Flow</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">1.</span>
              <div>
                <div className="text-white font-medium">Draw Equation</div>
                <div className="text-gray-400">User draws math on canvas</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">2.</span>
              <div>
                <div className="text-white font-medium">OCR Recognition</div>
                <div className="text-gray-400">System recognizes handwriting and returns confidence score</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">3.</span>
              <div>
                <div className="text-white font-medium">Review Result</div>
                <div className="text-gray-400">RecognitionResult popup appears with confidence indicator</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">4.</span>
              <div>
                <div className="text-white font-medium">User Action</div>
                <div className="text-gray-400">
                  <span className="text-green-300">✓ Accept</span> (convert to text) • 
                  <span className="text-red-300"> ✗ Reject</span> (keep handwriting) • 
                  <span className="text-blue-300"> ✎ Edit</span> (correct mistakes)
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">5.</span>
              <div>
                <div className="text-white font-medium">Learn & Improve</div>
                <div className="text-gray-400">Corrections are stored to improve future recognition</div>
              </div>
            </div>
          </div>
        </div>

        {/* Confidence Levels Guide */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/10 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Confidence Levels</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-24 text-center px-3 py-2 bg-green-500/20 text-green-400 rounded border border-green-500/50 font-bold">
                ≥ 80%
              </div>
              <div>
                <div className="text-white font-medium">High Confidence</div>
                <div className="text-sm text-gray-400">Safe to auto-accept in most cases</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 text-center px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/50 font-bold">
                50-80%
              </div>
              <div>
                <div className="text-white font-medium">Medium Confidence</div>
                <div className="text-sm text-gray-400">Always show for user review</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-24 text-center px-3 py-2 bg-red-500/20 text-red-400 rounded border border-red-500/50 font-bold">
                &lt; 50%
              </div>
              <div>
                <div className="text-white font-medium">Low Confidence</div>
                <div className="text-sm text-gray-400">Requires manual review and correction</div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl</kbd> + 
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs ml-1">Enter</kbd>
              <div className="text-gray-400 mt-1">Accept recognition</div>
            </div>
            
            <div>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Esc</kbd>
              <div className="text-gray-400 mt-1">Reject recognition</div>
            </div>
            
            <div>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl</kbd> + 
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs ml-1">E</kbd>
              <div className="text-gray-400 mt-1">Edit recognition</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recognition Result Component */}
      {showRecognitionResult && recognitionData && (
        <RecognitionResult
          recognizedText={recognitionData.recognizedText}
          confidence={recognitionData.confidence}
          alternatives={recognitionData.alternatives}
          originalStrokes={recognitionData.originalStrokes}
          position={recognitionData.position}
          onAccept={handleAccept}
          onReject={handleReject}
          onEdit={handleEdit}
        />
      )}

      {/* Correction Modal Component */}
      {showCorrectionModal && recognitionData && (
        <CorrectionModal
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          recognizedText={recognitionData.recognizedText}
          originalStrokes={recognitionData.originalStrokes}
          onSave={handleSaveCorrection}
        />
      )}
    </div>
  );
};

export default RecognitionFlowExample;
