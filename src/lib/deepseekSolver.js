/**
 * Free AI-powered equation solver using DeepSeek R1
 * Completely free model via OpenRouter - no credits needed!
 */

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_R1_MODEL = 'deepseek/deepseek-r1:free';

/**
 * Solve equation using DeepSeek R1 (FREE model via OpenRouter)
 * @param {string} equation - The equation to solve
 * @param {Object} options - Solver options
 * @returns {Promise<Object>} - { success, solution, explanation, steps }
 */
export async function solveWithDeepSeek(equation, options = {}) {
  const apiKey = options.apiKey || 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_API_KEY) || '';

  if (!apiKey) {
    return {
      success: false,
      error: 'Missing OpenRouter API key. Get FREE access at https://openrouter.ai/keys (no credit card needed)',
    };
  }

  const referer = (typeof window !== 'undefined' && window.location?.origin) || 'https://intellinote.app';

  const systemPrompt = options.systemPrompt || `You are a precise mathematical solver. When given an equation:

1. Solve it step-by-step
2. Show your work clearly
3. Provide ONLY the final numerical answer in the last line

Format: Just give the number or expression result.`;

  const userPrompt = options.userPrompt || `Solve this equation and provide the final answer:

${equation}

Give me just the final numerical result.`;

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': referer,
        'X-Title': 'IntelliNote - Free Math Solver',
      },
      body: JSON.stringify({
        model: DEEPSEEK_R1_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: options.maxTokens || 512,
        temperature: 0, // Zero temperature for deterministic math
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `OpenRouter request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim() || '';

    if (!content) {
      return {
        success: false,
        error: 'DeepSeek returned an empty response',
        raw: data,
      };
    }

    // Parse the response to extract the final answer
    const parsed = parseDeepSeekResponse(content);

    return {
      success: true,
      solution: parsed.finalAnswer || content,
      explanation: content,
      steps: parsed.steps,
      raw: data,
      usage: data?.usage || null,
      source: 'deepseek-r1',
      model: DEEPSEEK_R1_MODEL,
      cost: 0, // Completely FREE!
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Failed to contact OpenRouter',
    };
  }
}

/**
 * Parse DeepSeek R1 response to extract solution
 * @param {string} text - Response text
 * @returns {Object} - { steps, finalAnswer }
 */
function parseDeepSeekResponse(text) {
  const result = {
    steps: [],
    finalAnswer: null,
  };

  // Try to find answer patterns
  const answerPatterns = [
    /(?:final answer|answer|solution|result):\s*([^\n]+)/i,
    /=\s*([0-9.+-]+)\s*$/m,
    /(?:therefore|thus|hence),?\s*([^\n]+)/i,
    /\b(\d+(?:\.\d+)?)\s*$/m, // Just a number at the end
  ];

  for (const pattern of answerPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.finalAnswer = match[1].trim();
      break;
    }
  }

  // Extract steps (lines with numbers or bullet points)
  const lines = text.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (/^(\d+\.|[-*])\s/.test(trimmed) && trimmed.length > 5) {
      result.steps.push(trimmed.replace(/^(\d+\.|[-*])\s/, ''));
    }
  });

  // If no structured answer found, try to get the last meaningful line
  if (!result.finalAnswer) {
    const meaningfulLines = lines
      .map(l => l.trim())
      .filter(l => l.length > 0 && !/^(step|therefore|thus|hence)/i.test(l));
    
    if (meaningfulLines.length > 0) {
      const lastLine = meaningfulLines[meaningfulLines.length - 1];
      // Extract number from the last line
      const numberMatch = lastLine.match(/[0-9.+-]+/);
      if (numberMatch) {
        result.finalAnswer = numberMatch[0];
      } else {
        result.finalAnswer = lastLine;
      }
    }
  }

  return result;
}

/**
 * Assess complexity of an equation
 * @param {string} equation - Equation text
 * @returns {Object} - { level, reasons, score }
 */
export function assessComplexity(equation) {
  let score = 0;
  const reasons = [];
  const normalized = equation.toLowerCase();

  // Check for calculus
  if (/\b(derivative|diff|d\/dx|∂|integral|integrate|∫|limit|lim)\b/.test(normalized)) {
    score += 3;
    reasons.push('Contains calculus operations');
  }

  // Check for differential equations
  if (/\b(dy\/dx|d²y\/dx²|differential|ode|pde)\b/.test(normalized)) {
    score += 4;
    reasons.push('Differential equation detected');
  }

  // Check for matrix/linear algebra
  if (/\b(matrix|determinant|eigenvalue|eigenvector|rank|transpose)\b/.test(normalized)) {
    score += 3;
    reasons.push('Linear algebra operations');
  }

  // Check for trigonometric complexity
  const trigCount = (normalized.match(/\b(sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan)\b/g) || []).length;
  if (trigCount > 2) {
    score += 2;
    reasons.push('Complex trigonometric expressions');
  }

  // Check for exponentials/logarithms
  if (/\b(exp|ln|log|e\^|log10)\b/.test(normalized)) {
    score += 1;
    reasons.push('Exponential or logarithmic terms');
  }

  // Check for summations/products
  if (/\b(sum|∑|product|∏|series)\b/.test(normalized)) {
    score += 2;
    reasons.push('Series or product notation');
  }

  // Check nesting depth
  const parenDepth = equation.split('').reduce((max, char, i, arr) => {
    const depth = arr.slice(0, i + 1).filter(c => c === '(').length - 
                  arr.slice(0, i + 1).filter(c => c === ')').length;
    return Math.max(max, depth);
  }, 0);
  
  if (parenDepth > 3) {
    score += 1;
    reasons.push('Deeply nested expressions');
  }

  // Determine level
  let level;
  if (score === 0) level = 'simple';
  else if (score <= 2) level = 'moderate';
  else if (score <= 5) level = 'complex';
  else level = 'very-complex';

  return { level, score, reasons };
}

/**
 * Smart solver: tries local first, then DeepSeek R1 (free) if needed
 * @param {string} equation - Equation to solve
 * @param {Object} localEngine - MathEngine instance
 * @param {Object} options - Solver options
 * @returns {Promise<Object>} - Combined result
 */
export async function solveIntelligent(equation, localEngine, options = {}) {
  const complexity = assessComplexity(equation);
  
  // Try local engine first for simple equations
  if (complexity.level === 'simple' || complexity.level === 'moderate') {
    try {
      const localResult = localEngine?.solve(equation);
      if (localResult?.success) {
        return {
          ...localResult,
          complexity,
          source: 'local',
          cloudUsed: false,
          cost: 0,
        };
      }
    } catch {
      // Local failed, escalate to cloud
    }
  }

  // Use DeepSeek R1 (free) for everything else
  const deepseekResult = await solveWithDeepSeek(equation, options);
  return {
    ...deepseekResult,
    complexity,
    cloudUsed: true,
  };
}

export default {
  solveWithDeepSeek,
  solveIntelligent,
  assessComplexity,
};
