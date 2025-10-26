/**
 * OCR Learning System
 * Stores user corrections to improve future recognition
 */

const STORAGE_KEY = 'intellinote_ocr_corrections';
const MAX_CORRECTIONS = 1000; // Limit storage size

/**
 * Get all stored corrections
 */
export const getCorrections = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading corrections:', error);
    return [];
  }
};

/**
 * Record a user correction
 */
export const recordCorrection = (recognized, actual, strokes = null) => {
  try {
    const corrections = getCorrections();
    
    const correction = {
      id: Date.now() + Math.random(),
      recognized,
      actual,
      timestamp: new Date().toISOString(),
      strokeData: strokes ? simplifyStrokeData(strokes) : null
    };

    corrections.unshift(correction);

    // Limit storage size
    if (corrections.length > MAX_CORRECTIONS) {
      corrections.length = MAX_CORRECTIONS;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(corrections));
    
    console.log('Correction recorded:', { recognized, actual });
    return correction;
  } catch (error) {
    console.error('Error recording correction:', error);
    return null;
  }
};

/**
 * Simplify stroke data for storage
 */
const simplifyStrokeData = (strokes) => {
  if (!strokes || strokes.length === 0) return null;

  return {
    count: strokes.length,
    bounds: calculateBounds(strokes),
    features: extractFeatures(strokes)
  };
};

/**
 * Calculate bounding box of strokes
 */
const calculateBounds = (strokes) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  strokes.forEach(stroke => {
    stroke.points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });

  return {
    width: maxX - minX,
    height: maxY - minY,
    aspectRatio: (maxX - minX) / (maxY - minY)
  };
};

/**
 * Extract simple features from strokes
 */
const extractFeatures = (strokes) => {
  const totalPoints = strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
  
  return {
    strokeCount: strokes.length,
    pointCount: totalPoints,
    avgPointsPerStroke: totalPoints / strokes.length
  };
};

/**
 * Find similar examples from correction history
 */
export const getSimilarExamples = (strokes, limit = 5) => {
  if (!strokes || strokes.length === 0) return [];

  try {
    const corrections = getCorrections();
    const currentFeatures = simplifyStrokeData(strokes);
    
    if (!currentFeatures) return [];

    // Score each correction by similarity
    const scored = corrections
      .filter(c => c.strokeData)
      .map(correction => ({
        ...correction,
        similarity: calculateSimilarity(currentFeatures, correction.strokeData)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored;
  } catch (error) {
    console.error('Error finding similar examples:', error);
    return [];
  }
};

/**
 * Calculate similarity between two stroke features
 */
const calculateSimilarity = (features1, features2) => {
  let score = 0;

  // Stroke count similarity
  const strokeDiff = Math.abs(features1.count - features2.count);
  score += Math.max(0, 1 - strokeDiff / 5) * 0.3;

  // Aspect ratio similarity
  if (features1.bounds && features2.bounds) {
    const ratioDiff = Math.abs(features1.bounds.aspectRatio - features2.bounds.aspectRatio);
    score += Math.max(0, 1 - ratioDiff) * 0.3;
  }

  // Point count similarity
  if (features1.features && features2.features) {
    const pointDiff = Math.abs(features1.features.pointCount - features2.features.pointCount);
    score += Math.max(0, 1 - pointDiff / 100) * 0.4;
  }

  return score;
};

/**
 * Get common correction suggestions based on recognized text
 */
export const getSuggestions = (recognizedText) => {
  const suggestions = [];

  // Common OCR mistakes
  const commonMistakes = [
    // Similar looking characters
    { from: /\b0\b/g, to: 'O', reason: 'Did you mean the letter O instead of zero?' },
    { from: /\bO\b/g, to: '0', reason: 'Did you mean zero instead of the letter O?' },
    { from: /\b1\b/g, to: 'l', reason: 'Did you mean lowercase L instead of one?' },
    { from: /\bl\b/g, to: '1', reason: 'Did you mean one instead of lowercase L?' },
    { from: /x/g, to: '\\times', reason: 'Did you mean multiplication symbol instead of x?' },
    
    // Common function names
    { from: /sn/g, to: '\\sin', reason: 'Did you mean sin function?' },
    { from: /cs/g, to: '\\cos', reason: 'Did you mean cos function?' },
    { from: /tn/g, to: '\\tan', reason: 'Did you mean tan function?' },
    { from: /ln/g, to: '\\ln', reason: 'Did you mean natural logarithm?' },
    { from: /log/g, to: '\\log', reason: 'Did you mean logarithm function?' },
    
    // Greek letters (if detected incorrectly)
    { from: /alpha/gi, to: '\\alpha', reason: 'Did you mean Greek letter alpha?' },
    { from: /beta/gi, to: '\\beta', reason: 'Did you mean Greek letter beta?' },
    { from: /theta/gi, to: '\\theta', reason: 'Did you mean Greek letter theta?' },
    { from: /pi/gi, to: '\\pi', reason: 'Did you mean Greek letter pi?' },
    
    // Operators
    { from: /\*/g, to: '\\times', reason: 'Did you mean multiplication symbol?' },
    { from: /\//g, to: '\\div', reason: 'Did you mean division symbol?' },
    { from: /<=/g, to: '\\leq', reason: 'Did you mean less than or equal to?' },
    { from: />=/g, to: '\\geq', reason: 'Did you mean greater than or equal to?' },
  ];

  // Check for each common mistake
  commonMistakes.forEach(mistake => {
    if (mistake.from.test(recognizedText)) {
      const suggestedText = recognizedText.replace(mistake.from, mistake.to);
      if (suggestedText !== recognizedText) {
        suggestions.push({
          text: suggestedText,
          reason: mistake.reason
        });
      }
    }
  });

  // Check correction history for this specific recognized text
  const corrections = getCorrections();
  const historicalCorrections = corrections
    .filter(c => c.recognized === recognizedText && c.actual !== recognizedText)
    .slice(0, 3);

  historicalCorrections.forEach(correction => {
    if (!suggestions.find(s => s.text === correction.actual)) {
      suggestions.push({
        text: correction.actual,
        reason: 'You corrected this before'
      });
    }
  });

  return suggestions.slice(0, 5); // Limit to top 5 suggestions
};

/**
 * Improve confidence based on correction history
 */
export const improveConfidence = (result, strokes) => {
  try {
    const { text, confidence } = result;
    
    // Check if this exact text has been corrected before
    const corrections = getCorrections();
    const exactMatches = corrections.filter(c => c.recognized === text);
    
    if (exactMatches.length > 0) {
      // If always corrected to something else, lower confidence
      const uniqueCorrections = new Set(exactMatches.map(c => c.actual));
      if (uniqueCorrections.size === 1 && !uniqueCorrections.has(text)) {
        return {
          ...result,
          confidence: Math.max(0.1, confidence * 0.5),
          note: 'Historically corrected'
        };
      }
      
      // If sometimes accepted, slightly adjust confidence
      const acceptanceRate = exactMatches.filter(c => c.actual === text).length / exactMatches.length;
      const adjustedConfidence = confidence * (0.7 + acceptanceRate * 0.3);
      
      return {
        ...result,
        confidence: adjustedConfidence,
        note: `Historical acceptance: ${Math.round(acceptanceRate * 100)}%`
      };
    }

    // Check similar strokes
    if (strokes) {
      const similar = getSimilarExamples(strokes, 3);
      if (similar.length > 0 && similar[0].similarity > 0.7) {
        const mostSimilar = similar[0];
        if (mostSimilar.actual === text) {
          // Similar stroke was accepted with this text, boost confidence
          return {
            ...result,
            confidence: Math.min(1.0, confidence * 1.2),
            note: 'Similar stroke recognized correctly before'
          };
        } else {
          // Similar stroke was corrected differently, add alternative
          return {
            ...result,
            alternatives: [mostSimilar.actual, ...(result.alternatives || [])],
            note: 'Similar stroke corrected differently before'
          };
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error improving confidence:', error);
    return result;
  }
};

/**
 * Export correction data
 */
export const exportCorrections = () => {
  const corrections = getCorrections();
  const dataStr = JSON.stringify(corrections, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ocr-corrections-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
};

/**
 * Import correction data
 */
export const importCorrections = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        if (!Array.isArray(imported)) {
          throw new Error('Invalid format: expected array');
        }

        const existing = getCorrections();
        const merged = [...imported, ...existing];
        
        // Remove duplicates and limit size
        const unique = Array.from(
          new Map(merged.map(item => [item.id, item])).values()
        ).slice(0, MAX_CORRECTIONS);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
        resolve(unique.length);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

/**
 * Clear all corrections
 */
export const clearCorrections = () => {
  localStorage.removeItem(STORAGE_KEY);
  console.log('All corrections cleared');
};

/**
 * Get correction statistics
 */
export const getStats = () => {
  const corrections = getCorrections();
  
  const stats = {
    total: corrections.length,
    recentCount: corrections.filter(c => {
      const age = Date.now() - new Date(c.timestamp).getTime();
      return age < 7 * 24 * 60 * 60 * 1000; // Last 7 days
    }).length,
    mostCorrected: {},
    uniqueRecognized: new Set(),
    uniqueActual: new Set()
  };

  corrections.forEach(c => {
    stats.uniqueRecognized.add(c.recognized);
    stats.uniqueActual.add(c.actual);
    stats.mostCorrected[c.recognized] = (stats.mostCorrected[c.recognized] || 0) + 1;
  });

  stats.uniqueRecognized = stats.uniqueRecognized.size;
  stats.uniqueActual = stats.uniqueActual.size;

  // Find top 5 most corrected
  stats.topCorrected = Object.entries(stats.mostCorrected)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text, count]) => ({ text, count }));

  return stats;
};
