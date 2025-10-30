/**
 * Smart Math Solver - Frontend wrapper for the smart math engine
 * Automatically classifies and solves equations using the Python backend
 */

const API_URL = 'http://localhost:8000';

/**
 * Note types for classification hints
 */
export const NOTE_TYPES = {
  AUTO: 'auto',
  ALGEBRA: 'algebra',
  CALCULUS: 'calculus',
  PHYSICS: 'physics',
  STATISTICS: 'statistics',
  TRIGONOMETRY: 'trigonometry',
  LINEAR_ALGEBRA: 'linear_algebra',
  GENERAL: 'general'
};

/**
 * Note type metadata for UI
 */
export const NOTE_TYPE_INFO = {
  auto: {
    label: '🤖 Auto-Detect',
    description: 'Automatically detect the type of math problem',
    icon: '🤖',
    color: '#8B5CF6'
  },
  algebra: {
    label: '📐 Algebra',
    description: 'Solve algebraic equations and expressions',
    icon: '📐',
    color: '#3B82F6'
  },
  calculus: {
    label: '📊 Calculus',
    description: 'Derivatives, integrals, and limits',
    icon: '📊',
    color: '#10B981'
  },
  physics: {
    label: '⚡ Physics',
    description: 'Mechanics, electricity, and energy equations',
    icon: '⚡',
    color: '#F59E0B'
  },
  statistics: {
    label: '📈 Statistics',
    description: 'Mean, variance, probability, and distributions',
    icon: '📈',
    color: '#EF4444'
  },
  trigonometry: {
    label: '📐 Trigonometry',
    description: 'Trigonometric functions and identities',
    icon: '📐',
    color: '#6366F1'
  },
  linear_algebra: {
    label: '🔢 Linear Algebra',
    description: 'Matrices, vectors, and transformations',
    icon: '🔢',
    color: '#EC4899'
  },
  general: {
    label: '✍️ General Math',
    description: 'General mathematical notes',
    icon: '✍️',
    color: '#6B7280'
  }
};

/**
 * Solve a mathematical equation using the smart math engine
 * 
 * @param {string} equation - The equation to solve
 * @param {string} noteType - Optional note type hint ('auto', 'algebra', 'calculus', etc.)
 * @returns {Promise<Object>} - Solution result with classification and steps
 */
export async function solveMathEquation(equation, noteType = NOTE_TYPES.AUTO) {
  try {
    const response = await fetch(`${API_URL}/solve_math`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        equation: equation.trim(),
        note_type: noteType === NOTE_TYPES.AUTO ? null : noteType
      })
    });

    const result = await response.json();
    
    // Check if the response contains an error (even with 200 status)
    if (result.error || result.message) {
      return {
        success: false,
        error: result.error || 'Unknown error',
        message: result.message || result.user_message || result.error,
        user_message: result.message || result.user_message,
        suggestion: result.suggestion,
        hint: result.hint,
        error_type: result.error_type || 'general',
        original: result.original
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        error: result.detail || 'Failed to solve equation',
        message: result.detail || 'Failed to solve equation',
        user_message: `⚠️ ${result.detail || 'Failed to solve equation'}`,
        error_type: 'server_error'
      };
    }

    return result;
  } catch (error) {
    console.error('Math solver error:', error);
    
    // Network or connection error
    return {
      success: false,
      error: error.message,
      message: 'Failed to connect to math solver',
      user_message: '⚠️ Failed to connect to math solver. Make sure the Python server is running.',
      suggestion: 'Start the server with: python server/ocr_service_fast.py',
      hint: 'Check that the server is running on http://localhost:8000',
      error_type: 'connection_error',
      classification: null,
      result: null,
      explanation: `Failed to solve: ${error.message}`
    };
  }
}

/**
 * Quick classify an equation without solving
 * 
 * @param {string} equation - The equation to classify
 * @returns {Object} - Classification result
 */
export function quickClassifyEquation(equation) {
  const patterns = {
    calculus_derivative: [/d[xy]\/d[xy]/, /derivative/, /f'/, /\bd\/d[a-z]\b/i],
    calculus_integral: [/∫/, /integral/, /integrate/i],
    calculus_limit: [/lim/, /limit/, /approaches/i],
    physics: [/F\s*=\s*m\s*a/, /v\s*=\s*u/, /KE\s*=/, /PE\s*=/i],
    trigonometry: [/\bsin\b/, /\bcos\b/, /\btan\b/i],
    algebra: [/=/, /solve/, /find/i]
  };

  for (const [type, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      if (regex.test(equation)) {
        return {
          type: type.split('_')[0],
          confidence: 0.7
        };
      }
    }
  }

  return {
    type: 'algebra',
    confidence: 0.5
  };
}

/**
 * Format solution result for display
 * 
 * @param {Object} result - Solution result from the math engine
 * @returns {Object} - Formatted display data
 */
export function formatSolutionForDisplay(result) {
  if (!result || !result.success) {
    return {
      success: false,
      error: result?.error || 'Unknown error',
      message: `Error: ${result?.error || 'Failed to solve equation'}`
    };
  }

  const { classification, result: solution, explanation } = result;

  // Extract solution values
  let solutionText = '';
  let steps = [];

  if (solution) {
    const solutionType = solution.type;

    switch (solutionType) {
      case 'equation_solution':
        solutionText = formatSolutions(solution.solutions, solution.variable);
        steps = solution.steps || [];
        break;

      case 'derivative':
        solutionText = `f'(${solution.variable}) = ${solution.result}`;
        steps = solution.steps || [];
        break;

      case 'definite_integral':
      case 'indefinite_integral':
        solutionText = solution.result;
        steps = solution.steps || [];
        break;

      case 'limit':
        solutionText = `lim = ${solution.result}`;
        steps = solution.steps || [];
        break;

      case 'physics_solution':
        solutionText = formatSolutions(solution.solutions, solution.variable);
        steps = solution.steps || [];
        break;

      case 'simplification':
        solutionText = solution.result;
        steps = solution.steps || [];
        break;

      default:
        solutionText = JSON.stringify(solution.result || solution);
        steps = solution.steps || [];
    }
  }

  return {
    success: true,
    type: solution?.type || 'unknown',
    solution: solutionText,
    steps: steps,
    classification: classification,
    explanation: explanation,
    latex: solutionText
  };
}

/**
 * Format solution array for display
 */
function formatSolutions(solutions, variable) {
  if (!solutions) return '';

  if (Array.isArray(solutions)) {
    if (solutions.length === 0) return 'No solution';
    
    // Check if solutions are already formatted with "variable = value"
    if (solutions.length > 0 && typeof solutions[0] === 'string' && solutions[0].includes('=')) {
      // Already formatted by backend
      return solutions.join(', ');
    }
    
    // Format with variable name
    if (solutions.length === 1) {
      return variable ? `${variable} = ${solutions[0]}` : solutions[0];
    }
    return solutions.map((sol, i) => 
      variable ? `${variable}_{${i + 1}} = ${sol}` : sol
    ).join(', ');
  }

  if (typeof solutions === 'object') {
    return Object.entries(solutions)
      .map(([key, value]) => `${key} = ${value}`)
      .join(', ');
  }

  return String(solutions);
}

/**
 * Check if the math solver service is available
 * 
 * @returns {Promise<boolean>} - True if service is available
 */
export async function checkMathSolverHealth() {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) return false;

    const data = await response.json();
    return data.status === 'ok' && data.features?.includes('math_solver');
  } catch (error) {
    console.warn('Math solver service unavailable:', error);
    return false;
  }
}

/**
 * Get confidence color for UI display
 */
export function getConfidenceColor(confidence) {
  if (confidence >= 0.9) return '#10B981'; // green
  if (confidence >= 0.7) return '#F59E0B'; // yellow
  if (confidence >= 0.5) return '#EF4444'; // red
  return '#6B7280'; // gray
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(confidence) {
  if (confidence >= 0.9) return 'High Confidence';
  if (confidence >= 0.7) return 'Medium Confidence';
  if (confidence >= 0.5) return 'Low Confidence';
  return 'Very Low Confidence';
}
