import { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { solveWithDeepSeek } from '../../lib/deepseekSolver';
import { recognizeHandwriting as recognizeWithLocal } from '../../lib/localOCR';
import { recognizeHandwriting as recognizeWithOpenRouter } from '../../lib/openrouterOCR';
import { createStrokeSignature, getOCRCache } from '../../config/ocr';
import GlassModal from '../common/GlassModal';
import GlassInput from '../common/GlassInput';
import GlassButton from '../common/GlassButton';

/**
 * SolvePrompt - Shows when "=" is detected
 * Captures canvas region, runs OCR, allows editing, then solves
 */
const SolvePrompt = ({
  strokes,
  bounds,
  onSolve,
  onCancel,
}) => {
  const [step, setStep] = useState('confirm'); // 'confirm' | 'recognizing' | 'edit' | 'solving' | 'result'
  const [recognizedEquation, setRecognizedEquation] = useState('');
  const [editedEquation, setEditedEquation] = useState('');
  const [error, setError] = useState(null);
  const [resultData, setResultData] = useState(null);

  const strokeSignature = useMemo(() => createStrokeSignature(strokes), [strokes]);

  // Step 1: Capture canvas region and run OCR
  const handleRecognize = useCallback(async () => {
  setStep('recognizing');
  setError(null);
  setResultData(null);

    try {
      // Run Local TrOCR on the strokes
      let result = null;
      let recognitionError = null;

      try {
        result = await recognizeWithLocal(strokes, {
          cache: getOCRCache(),
          cacheKey: strokeSignature,
        });
      } catch (localError) {
        recognitionError = localError;
      }

      if (!result || !result.latex) {
        try {
          const cloudResult = await recognizeWithOpenRouter(strokes, {
            cache: getOCRCache(),
            cacheKey: `${strokeSignature}-cloud`,
            bypassCache: false,
          });
          if (cloudResult && cloudResult.latex) {
            result = cloudResult;
          } else {
            recognitionError = new Error(cloudResult?.error || recognitionError?.message || 'Could not recognize equation');
          }
        } catch (cloudError) {
          recognitionError = cloudError;
        }
      }

      if (result && result.latex) {
        const equation = result.latex.trim();
        setRecognizedEquation(equation);
        setEditedEquation(equation);
        setStep('edit');
      } else {
        throw recognitionError || new Error('Could not recognize equation');
      }
    } catch (err) {
      console.error('OCR failed:', err);
      setError(err.message || 'Failed to recognize handwriting');
      setStep('confirm');
    }
  }, [strokes, strokeSignature]);

  // Step 2: Solve the equation
  const handleSolve = useCallback(async () => {
  const equationToSolve = editedEquation || recognizedEquation;
    
    if (!equationToSolve.trim()) {
      setError('Please enter an equation');
      return;
    }

  setStep('solving');
  setError(null);

    try {
      const apiKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_API_KEY;
      
      const result = await solveWithDeepSeek(equationToSolve, {
        apiKey,
      });

      if (result.success && result.solution) {
        const steps = Array.isArray(result.steps)
          ? result.steps
          : typeof result.steps === 'string'
            ? result.steps.split('\n').map((line) => line.trim()).filter(Boolean)
            : [];

        const payload = {
          equation: equationToSolve,
          solution: result.solution,
          explanation: result.explanation,
          steps,
          rawSteps: result.steps,
          bounds,
          signature: strokeSignature,
        };

        setResultData(payload);
        setStep('result');

        // Render on canvas immediately so it appears next to the "=" sign
        onSolve(payload);
      } else {
        throw new Error(result.error || 'Failed to solve equation');
      }
    } catch (err) {
      console.error('Solve failed:', err);
      setError(err.message || 'Failed to solve equation');
      setStep('edit');
    }
  }, [editedEquation, recognizedEquation, bounds, onSolve, strokeSignature]);

  const handleEditAgain = useCallback(() => {
    if (resultData?.equation) {
      setEditedEquation(resultData.equation);
    }
    setResultData(null);
    setError(null);
    setStep('edit');
  }, [resultData]);

  return (
    <GlassModal
      isOpen={true}
      onClose={onCancel}
      title={
        step === 'confirm' ? 'Solve Equation?' :
        step === 'recognizing' ? 'Recognizing...' :
        step === 'edit' ? 'Verify Equation' :
        step === 'solving' ? 'Solving...' :
        'Solution Steps'
      }
    >
      <div className="space-y-4">
        {/* Step 1: Confirm detection */}
        {step === 'confirm' && (
          <>
            <p className="text-sm text-gray-600">
              Detected an equals sign. Would you like to solve this equation?
            </p>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <GlassButton onClick={onCancel} variant="secondary">
                Cancel
              </GlassButton>
              <GlassButton onClick={handleRecognize}>
                Yes, Solve It
              </GlassButton>
            </div>
          </>
        )}

        {/* Step 2: Recognizing */}
        {step === 'recognizing' && (
          <div className="flex flex-col items-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-gray-600">
              Reading your handwriting...
            </p>
          </div>
        )}

        {/* Step 3: Edit equation */}
        {step === 'edit' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Recognized Equation:
              </label>
              <GlassInput
                value={editedEquation}
                onChange={(e) => setEditedEquation(e.target.value)}
                placeholder="x + 5 = 0"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Edit if recognition isn't perfect
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <GlassButton onClick={onCancel} variant="secondary">
                Cancel
              </GlassButton>
              <GlassButton onClick={handleSolve}>
                Solve
              </GlassButton>
            </div>
          </>
        )}

        {/* Step 4: Solving */}
        {step === 'solving' && (
          <div className="flex flex-col items-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-gray-600">
              Solving with DeepSeek R1...
            </p>
          </div>
        )}

        {/* Step 5: Show result and steps */}
        {step === 'result' && resultData && (
          <>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-medium">Final Answer:</p>
              <p className="text-lg font-semibold">{resultData.solution}</p>
            </div>

            {resultData.equation && (
              <div className="rounded-md border border-slate-200 bg-white/70 p-3 text-xs text-gray-600">
                Equation solved: <span className="font-medium text-gray-800">{resultData.equation}</span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Steps:</p>
              {resultData.steps.length > 0 ? (
                <ol className="list-decimal space-y-2 rounded-lg border border-slate-200 bg-white/70 p-4 text-sm text-gray-700">
                  {resultData.steps.map((stepText, index) => (
                    <li key={index} className="ml-4">{stepText}</li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white/70 p-4 text-sm text-gray-600">
                  Detailed steps were not returned. Full explanation:
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-gray-700">{resultData.explanation || 'No detailed explanation returned.'}</pre>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <GlassButton onClick={handleEditAgain} variant="secondary">
                Edit Equation
              </GlassButton>
              <GlassButton onClick={onCancel}>
                Done
              </GlassButton>
            </div>
          </>
        )}
      </div>
    </GlassModal>
  );
};

SolvePrompt.propTypes = {
  strokes: PropTypes.arrayOf(PropTypes.object).isRequired,
  bounds: PropTypes.shape({
    minX: PropTypes.number,
    minY: PropTypes.number,
    maxX: PropTypes.number,
    maxY: PropTypes.number,
    centerX: PropTypes.number,
    centerY: PropTypes.number,
  }).isRequired,
  onSolve: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default SolvePrompt;
