/**
 * MathEngine - Core mathematical computation engine for IntelliNote
 * Handles equation parsing, variable management, and solving
 * Uses math.js for advanced mathematical operations
 */

import * as mathjs from 'mathjs';

// Create a math.js instance with all functions
const math = mathjs.create(mathjs.all);

/**
 * MathEngine class - Main engine for mathematical operations
 */
class MathEngine {
  constructor() {
    // Store for variables (name -> value)
    this.variables = new Map();
    
    // Store for formulas (name -> expression)
    this.formulas = new Map();
    
    // Math.js parser for expression evaluation
    this.parser = math.parser();
    
    // Reserved function names that should not be treated as variables
    this.reservedFunctions = new Set([
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
      'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
      'sqrt', 'cbrt', 'log', 'log10', 'log2', 'ln', 'exp',
      'abs', 'ceil', 'floor', 'round', 'sign',
      'min', 'max', 'pow', 'mod', 'gcd', 'lcm',
      'factorial', 'combinations', 'permutations',
      'pi', 'e', 'tau', 'phi', 'i',
      // calculus helpers
      'derivative', 'diff', 'integrate'
    ]);

    // Register calculus helpers in math and parser scope
    this._registerCalculusFunctions();
  }

  /**
   * Internal: register calculus helper functions (derivative/diff/integrate)
   */
  _registerCalculusFunctions() {
    // Keep reference to this inside closures
    const engine = this;

    // Helper to resolve a possibly string expression to a compiled function of variable
    const compileExprToFunction = (expr, variable) => {
      const exprStr = typeof expr === 'string' ? expr : (expr && expr.toString ? expr.toString() : String(expr));
      const node = math.parse(exprStr);
      const code = node.compile();
      return (x) => {
        const scope = Object.fromEntries(engine.variables);
        scope[variable] = x;
        return code.evaluate(scope);
      };
    };

    // Numeric definite integral using Simpson's rule
    const simpson = (f, a, b, n = 512) => {
      if (!isFinite(a) || !isFinite(b)) {
        throw new Error('Integral bounds must be finite numbers');
      }
      // Ensure n is even
      n = Math.max(2, Math.floor(n));
      if (n % 2 === 1) n += 1;
      const h = (b - a) / n;
      let sum = f(a) + f(b);
      for (let i = 1; i < n; i++) {
        const x = a + i * h;
        sum += (i % 2 === 0 ? 2 : 4) * f(x);
      }
      return (h / 3) * sum;
    };

    // diff(expr, variable, [at]) -> symbolic as string or numeric at point
    const diffFn = (expr, variable, at) => {
      const varName = typeof variable === 'string' ? variable : String(variable);
      const exprNode = typeof expr === 'string' ? math.parse(expr) : expr;
      const dNode = math.derivative(exprNode, varName);
      if (at !== undefined && at !== null) {
        // Evaluate at point (allow string expression for at)
        let atVal;
        try {
          atVal = typeof at === 'number' ? at : engine.evaluate(String(at));
        } catch {
          atVal = Number(at);
        }
        const scope = Object.fromEntries(engine.variables);
        scope[varName] = atVal;
        return dNode.evaluate(scope);
      }
      // Return a string representation for symbolic derivative
      return dNode.toString();
    };

    // derivative is an alias of diff
    const derivativeFn = (expr, variable, at) => diffFn(expr, variable, at);

    // integrate(expr, variable, a, b, [n]) numeric definite integral
    const integrateFn = (expr, variable, a, b, n) => {
      if (b === undefined || b === null) {
        throw new Error('Indefinite integral not supported. Provide bounds a and b.');
      }
      const varName = typeof variable === 'string' ? variable : String(variable);
      // Resolve bounds (allow expressions)
      const lower = typeof a === 'number' ? a : engine.evaluate(String(a));
      const upper = typeof b === 'number' ? b : engine.evaluate(String(b));
      const f = compileExprToFunction(expr, varName);
      return simpson(f, lower, upper, n ?? 512);
    };

    // Register to math instance (so parser can use them)
    math.import({ diff: diffFn, derivative: derivativeFn, integrate: integrateFn }, { override: true });

    // Also put in parser scope explicitly to be safe
    try {
      this.parser.set('diff', diffFn);
      this.parser.set('derivative', derivativeFn);
      this.parser.set('integrate', integrateFn);
    } catch {
      // ignore
    }
  }

  /**
   * Parse an equation string into its components
   * @param {string} text - The equation text (e.g., "x = 5" or "2 + 3")
   * @returns {Object} - { left, right, isEquation }
   */
  parseEquation(text) {
    try {
      // Clean the input
      const cleaned = text.trim();
      
      // Check if it contains an equals sign
      const parts = cleaned.split('=');
      
      if (parts.length === 1) {
        // No equals sign - just an expression
        return {
          left: null,
          right: parts[0].trim(),
          isEquation: false
        };
      } else if (parts.length === 2) {
        // Standard equation with left = right
        return {
          left: parts[0].trim(),
          right: parts[1].trim(),
          isEquation: true
        };
      } else {
        // Multiple equals signs - invalid
        throw new Error('Invalid equation: multiple equals signs found');
      }
    } catch (error) {
      throw new Error(`Parse error: ${error.message}`);
    }
  }

  /**
   * Extract all variables from an expression
   * @param {string} expression - Mathematical expression
   * @returns {Array<string>} - Array of unique variable names
   */
  extractVariables(expression) {
    try {
      // Parse the expression to get the syntax tree
      const root = math.parse(expression);
      const variables = new Set();

      // Recursive visitor that tracks bound variables (e.g., integrate(expr, x, a, b))
      const visit = (node, bound) => {
        const boundSet = bound || new Set();
        switch (node.type) {
          case 'SymbolNode': {
            const name = node.name;
            if (!this.reservedFunctions.has(name) &&
                !boundSet.has(name) &&
                !Object.prototype.hasOwnProperty.call(math, name)) {
              variables.add(name);
            }
            break;
          }
          case 'FunctionNode': {
            // Function name might be in node.fn.name or node.name
            const fnName = (node.fn && node.fn.name) || node.name || '';
            const args = node.args || [];

            if (fnName === 'integrate' || fnName === 'diff' || fnName === 'derivative') {
              // Second arg is the bound variable (SymbolNode or string ConstantNode)
              let varName = null;
              const varArg = args[1];
              if (varArg) {
                if (varArg.type === 'SymbolNode') varName = varArg.name;
                else if (varArg.type === 'ConstantNode' && typeof varArg.value === 'string') varName = varArg.value;
              }
              const nextBound = new Set(boundSet);
              if (varName) nextBound.add(varName);
              // Visit expression (arg0) with bound var
              if (args[0]) visit(args[0], nextBound);
              // Visit remaining args (bounds), do not inherit bound var
              for (let i = 2; i < args.length; i++) {
                visit(args[i], boundSet);
              }
              break;
            }

            // Generic: visit all args with same bound set
            args.forEach(child => visit(child, boundSet));
            break;
          }
          default: {
            if (typeof node.forEach === 'function') {
              node.forEach(child => visit(child, boundSet));
            } else if (Array.isArray(node.args)) {
              node.args.forEach(child => visit(child, boundSet));
            }
          }
        }
      };

      visit(root, new Set());
      return Array.from(variables);
    } catch {
      // Fallback to regex-based extraction if parsing fails
      const matches = expression.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];

      // Attempt to remove bound variables from integrate/diff patterns
      const bound = new Set();
      const integrateRe = /integrate\(([^)]*?),\s*([a-zA-Z_]\w*)\s*,/g;
      const diffRe = /(?:diff|derivative)\(([^,]*?),\s*([a-zA-Z_]\w*)/g;
      let m;
      while ((m = integrateRe.exec(expression)) !== null) {
        bound.add(m[2]);
      }
      while ((m = diffRe.exec(expression)) !== null) {
        bound.add(m[2]);
      }

      return [...new Set(matches.filter(name => !this.reservedFunctions.has(name) && !bound.has(name)))];
    }
  }

  /**
   * Store a variable with its value
   * @param {string} name - Variable name
   * @param {*} value - Variable value (number, expression, or unit)
   * @throws {Error} - If value is invalid
   */
  storeVariable(name, value) {
    try {
      // Validate variable name
      if (!name || typeof name !== 'string') {
        throw new Error('Variable name must be a non-empty string');
      }
      
      // Check if name is reserved
      if (this.reservedFunctions.has(name)) {
        throw new Error(`Cannot use reserved function name: ${name}`);
      }
      
      // Type checking and conversion
      let storedValue;
      
      if (typeof value === 'number') {
        // Direct number
        storedValue = value;
      } else if (typeof value === 'string') {
        // Try to evaluate as expression
        try {
          storedValue = this.evaluate(value);
        } catch {
          // Store as string if evaluation fails
          storedValue = value;
        }
      } else if (value && typeof value === 'object' && value.type) {
        // Math.js unit or complex number
        storedValue = value;
      } else {
        throw new Error('Invalid value type');
      }
      
      // Store in both internal map and math.js parser
      this.variables.set(name, storedValue);
      this.parser.set(name, storedValue);
      
    } catch (error) {
      throw new Error(`Failed to store variable ${name}: ${error.message}`);
    }
  }

  /**
   * Store a formula (equation definition)
   * @param {string} name - Variable name (left side)
   * @param {string} expression - Expression (right side)
   */
  storeFormula(name, expression) {
    try {
      // Validate inputs
      if (!name || typeof name !== 'string') {
        throw new Error('Formula name must be a non-empty string');
      }
      
      if (!expression || typeof expression !== 'string') {
        throw new Error('Formula expression must be a non-empty string');
      }
      
      // Check if name is reserved
      if (this.reservedFunctions.has(name)) {
        throw new Error(`Cannot use reserved function name: ${name}`);
      }
      
      // Validate that expression can be parsed
      try {
        math.parse(expression);
      } catch (e) {
        throw new Error(`Invalid expression: ${e.message}`);
      }
      
      // Store the formula
      this.formulas.set(name, expression);
      
    } catch (error) {
      throw new Error(`Failed to store formula ${name}: ${error.message}`);
    }
  }

  /**
   * Evaluate an expression with current variable values
   * @param {string} expression - Mathematical expression
   * @returns {*} - Result of evaluation
   */
  evaluate(expression) {
    try {
      // Use the parser which has all stored variables
      const out = this.parser.evaluate(expression);
      // Convert symbolic Nodes to string for display
      if (out && typeof out === 'object' && out.isNode) {
        return out.toString();
      }
      return out;
    } catch (error) {
      throw new Error(`Evaluation error: ${error.message}`);
    }
  }

  /**
   * Solve an equation or expression
   * @param {string} equation - The equation or expression to solve
   * @returns {Object} - { success, result, steps, variable }
   */
  solve(equation) {
    const steps = [];
    
    try {
      // Parse the equation
      const parsed = this.parseEquation(equation);
      steps.push({ action: 'parse', data: parsed });
      
      // Case 1: Just an expression (no equals sign)
      if (!parsed.isEquation) {
        return this.solveExpression(parsed.right, steps);
      }
      
      // Case 2: Expression with trailing equals sign (e.g., "5+5 =" or "f =")
      // Treat as expression to evaluate. If left side is a symbol with a stored formula,
      // evaluate the formula expression instead.
      if (parsed.isEquation && (!parsed.right || parsed.right.trim() === '')) {
        const leftExpr = (parsed.left || '').trim();
        // If leftExpr is a simple identifier and we have a stored formula for it, use that
        const isIdentifier = /^[a-zA-Z_]\w*$/.test(leftExpr);
        if (isIdentifier && this.formulas.has(leftExpr)) {
          const formulaExpr = this.formulas.get(leftExpr);
          steps.push({ action: 'formula_substitution', variable: leftExpr, expression: formulaExpr });
          return this.solveExpression(formulaExpr, steps);
        }
        // Otherwise, evaluate the left expression directly (e.g., "x + y")
        return this.solveExpression(leftExpr, steps);
      }
      
      // Case 3: Direct assignment (x = 5)
      const leftVars = this.extractVariables(parsed.left);
      const rightVars = this.extractVariables(parsed.right);
      
      if (leftVars.length === 1 && rightVars.length === 0) {
        return this.solveDirectAssignment(parsed.left, parsed.right, steps);
      }
      
      // Case 4: Formula storage (F = ma)
      if (leftVars.length === 1 && rightVars.length > 0) {
        return this.solveFormula(parsed.left, parsed.right, steps);
      }
      
      // Case 5: Solve for unknown variable
      return this.solveForUnknown(parsed.left, parsed.right, steps);
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        steps
      };
    }
  }

  /**
   * Solve a simple expression
   * @param {string} expression - Expression to evaluate
   * @param {Array} steps - Steps array to append to
   * @returns {Object} - Result object
   */
  solveExpression(expression, steps) {
    try {
      // Clean expression (remove question marks if present)
      const cleanExpr = expression.replace(/\?/g, '').trim();
      
      steps.push({ action: 'evaluate', expression: cleanExpr });
      
      const result = this.evaluate(cleanExpr);
      
      steps.push({ action: 'result', value: result });
      
      return {
        success: true,
        result,
        steps,
        type: 'expression'
      };
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error.message}`);
    }
  }

  /**
   * Handle direct variable assignment (x = 5)
   * @param {string} left - Variable name
   * @param {string} right - Value expression
   * @param {Array} steps - Steps array
   * @returns {Object} - Result object
   */
  solveDirectAssignment(left, right, steps) {
    try {
      const varName = left.trim();
      const value = this.evaluate(right);
      
      steps.push({ action: 'assign', variable: varName, value });
      
      this.storeVariable(varName, value);
      
      steps.push({ action: 'store', variable: varName, value });
      
      return {
        success: true,
        result: value,
        variable: varName,
        steps,
        type: 'assignment'
      };
    } catch (error) {
      throw new Error(`Failed to assign variable: ${error.message}`);
    }
  }

  /**
   * Handle formula storage and evaluation (F = ma)
   * @param {string} left - Result variable
   * @param {string} right - Formula expression
   * @param {Array} steps - Steps array
   * @returns {Object} - Result object
   */
  solveFormula(left, right, steps) {
    try {
      const resultVar = left.trim();
      const rightVars = this.extractVariables(right);
      
      steps.push({ 
        action: 'formula_detected', 
        variable: resultVar, 
        expression: right,
        requiredVars: rightVars 
      });
      
      // Store the formula for future use
      this.storeFormula(resultVar, right);
      
      // Check if we can evaluate it now (all variables known)
      const unknownVars = rightVars.filter(v => !this.variables.has(v));
      
      if (unknownVars.length === 0) {
        // All variables known - calculate result
        const result = this.evaluate(right);
        this.storeVariable(resultVar, result);
        
        steps.push({ 
          action: 'calculate', 
          expression: right,
          substitutions: Object.fromEntries(
            rightVars.map(v => [v, this.variables.get(v)])
          ),
          result 
        });
        
        return {
          success: true,
          result,
          variable: resultVar,
          steps,
          type: 'formula_evaluation'
        };
      } else {
        // Some variables unknown - just store formula
        steps.push({ 
          action: 'formula_stored', 
          missingVars: unknownVars 
        });
        
        return {
          success: true,
          result: null,
          variable: resultVar,
          formula: right,
          missingVariables: unknownVars,
          steps,
          type: 'formula_storage'
        };
      }
    } catch (error) {
      throw new Error(`Failed to process formula: ${error.message}`);
    }
  }

  /**
   * Solve for an unknown variable (F = ma where F=50, m=5, solve for a)
   * @param {string} left - Left side of equation
   * @param {string} right - Right side of equation
   * @param {Array} steps - Steps array
   * @returns {Object} - Result object
   */
  solveForUnknown(left, right, steps) {
    try {
      // Get all variables from both sides
      const leftVars = this.extractVariables(left);
      const rightVars = this.extractVariables(right);
      const allVars = [...new Set([...leftVars, ...rightVars])];
      
      // Find unknown variables
      const unknownVars = allVars.filter(v => !this.variables.has(v));
      
      if (unknownVars.length === 0) {
        // All variables known - verify equation or calculate
        const leftVal = this.evaluate(left);
        const rightVal = this.evaluate(right);
        
        steps.push({ 
          action: 'verify', 
          leftValue: leftVal, 
          rightValue: rightVal 
        });
        
        const isEqual = Math.abs(leftVal - rightVal) < 1e-10;
        
        return {
          success: true,
          result: isEqual,
          leftValue: leftVal,
          rightValue: rightVal,
          verified: isEqual,
          steps,
          type: 'verification'
        };
      }
      
      if (unknownVars.length === 1) {
        // One unknown - solve for it
        const unknown = unknownVars[0];
        
        steps.push({ 
          action: 'solve_for', 
          variable: unknown,
          equation: `${left} = ${right}`
        });
        
        // Use symbolic solving if possible
        try {
          // Try to isolate the variable algebraically
          const result = this.algebraicSolve(left, right, unknown, steps);
          
          if (result !== null) {
            this.storeVariable(unknown, result);
            
            return {
              success: true,
              result,
              variable: unknown,
              steps,
              type: 'solved'
            };
          }
        } catch (e) {
          steps.push({ action: 'algebraic_solve_failed', error: e.message });
        }
        
        // Fallback to numerical solving
        return this.numericalSolve(left, right, unknown, steps);
      }
      
      // Multiple unknowns - cannot solve
      return {
        success: false,
        error: 'Cannot solve: multiple unknown variables',
        unknownVariables: unknownVars,
        steps,
        type: 'unsolvable'
      };
      
    } catch (error) {
      throw new Error(`Failed to solve for unknown: ${error.message}`);
    }
  }

  /**
   * Algebraic solving for simple linear equations
   * @param {string} left - Left side
   * @param {string} right - Right side
   * @param {string} variable - Variable to solve for
   * @param {Array} steps - Steps array
   * @returns {number|null} - Result or null if cannot solve
   */
  algebraicSolve(left, right, variable, steps) {
    try {
      // Create equation: left - right = 0
      const equation = `(${left}) - (${right})`;
      
      // Try to use math.js derivative and solve
      const node = math.parse(equation);
      
      // Check if it's linear in the variable
      const derivative = math.derivative(node, variable);
      const derivativeValue = derivative.evaluate(
        Object.fromEntries(this.variables)
      );
      
      steps.push({ 
        action: 'algebraic_derivative', 
        derivative: derivative.toString() 
      });
      
      // If derivative is constant, it's linear
      if (typeof derivativeValue === 'number') {
        // Linear equation: f(x) = a*x + b = 0
        // Solve: x = -b/a
        
        // Evaluate at x = 0 to get b
        const tempParser = math.parser();
        for (const [key, val] of this.variables) {
          if (key !== variable) {
            tempParser.set(key, val);
          }
        }
        tempParser.set(variable, 0);
        const b = tempParser.evaluate(equation);
        
        const result = -b / derivativeValue;
        
        steps.push({ 
          action: 'linear_solve', 
          method: 'algebraic',
          result 
        });
        
        return result;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Numerical solving using Newton's method
   * @param {string} left - Left side
   * @param {string} right - Right side
   * @param {string} variable - Variable to solve for
   * @param {Array} steps - Steps array
   * @returns {Object} - Result object
   */
  numericalSolve(left, right, variable, steps) {
    try {
      const equation = `(${left}) - (${right})`;
      const node = math.parse(equation);
      const derivative = math.derivative(node, variable);
      
      steps.push({ action: 'numerical_solve', method: 'Newton-Raphson' });
      
      // Newton's method
      let x = 1; // Initial guess
      const maxIterations = 100;
      const tolerance = 1e-10;
      
      const createEvalScope = (xVal) => {
        const scope = Object.fromEntries(this.variables);
        scope[variable] = xVal;
        return scope;
      };
      
      for (let i = 0; i < maxIterations; i++) {
        const scope = createEvalScope(x);
        const fx = node.evaluate(scope);
        const fpx = derivative.evaluate(scope);
        
        if (Math.abs(fpx) < 1e-15) {
          throw new Error('Derivative too small, cannot continue iteration');
        }
        
        const nextX = x - fx / fpx;
        
        if (Math.abs(nextX - x) < tolerance) {
          steps.push({ 
            action: 'converged', 
            iterations: i + 1, 
            result: nextX 
          });
          
          this.storeVariable(variable, nextX);
          
          return {
            success: true,
            result: nextX,
            variable,
            iterations: i + 1,
            steps,
            type: 'numerical_solution'
          };
        }
        
        x = nextX;
      }
      
      throw new Error('Failed to converge within maximum iterations');
      
    } catch (error) {
      return {
        success: false,
        error: `Numerical solving failed: ${error.message}`,
        steps,
        type: 'numerical_failed'
      };
    }
  }

  /**
   * Get stored variable value
   * @param {string} name - Variable name
   * @returns {*} - Variable value or undefined
   */
  getVariable(name) {
    return this.variables.get(name);
  }

  /**
   * Get stored formula
   * @param {string} name - Formula name
   * @returns {string} - Formula expression or undefined
   */
  getFormula(name) {
    return this.formulas.get(name);
  }

  /**
   * Get all variables
   * @returns {Map} - All variables
   */
  getAllVariables() {
    return new Map(this.variables);
  }

  /**
   * Get all formulas
   * @returns {Map} - All formulas
   */
  getAllFormulas() {
    return new Map(this.formulas);
  }

  /**
   * Clear a specific variable
   * @param {string} name - Variable name
   */
  clearVariable(name) {
    this.variables.delete(name);
    try {
      this.parser.remove(name);
    } catch {
      // Ignore if variable doesn't exist in parser
    }
  }

  /**
   * Clear all variables
   */
  clearAllVariables() {
    this.variables.clear();
    this.parser.clear();
  }

  /**
   * Clear all formulas
   */
  clearAllFormulas() {
    this.formulas.clear();
  }

  /**
   * Reset the entire engine
   */
  reset() {
    this.clearAllVariables();
    this.clearAllFormulas();
  }

  /**
   * Scan text for formulas and equations
   * @param {string} canvasText - Text content from canvas (multiline)
   * @returns {Object} - { equations: [], variables: Map, formulas: Map }
   */
  scanForFormulas(canvasText) {
    const lines = canvasText.split('\n').map(l => l.trim()).filter(l => l);
    const equations = [];
    const variables = new Map();
    const formulas = new Map();
    
    lines.forEach(line => {
      if (!line.includes('=')) return;
      
      try {
        const parsed = this.parseEquation(line);
        if (!parsed.isEquation) return;
        
        equations.push(line);
        
        // Check if it's a simple assignment
        const leftVars = this.extractVariables(parsed.left);
        const rightVars = this.extractVariables(parsed.right);
        
        if (leftVars.length === 1 && rightVars.length === 0) {
          // Variable assignment
          try {
            const value = this.evaluate(parsed.right);
            variables.set(leftVars[0], value);
          } catch {
            // Couldn't evaluate
          }
        } else if (leftVars.length === 1 && rightVars.length > 0) {
          // Formula definition
          formulas.set(leftVars[0], {
            expression: parsed.right,
            variables: rightVars
          });
        }
      } catch {
        // Skip invalid equations
      }
    });
    
    return { equations, variables, formulas };
  }

  /**
   * Find a relevant formula that defines a given variable
   * @param {string} variable - Variable name to search for
   * @param {Object} options - { searchLibrary: boolean }
   * @returns {Object|null} - { name, expression, source } or null
   */
  findRelevantFormula(variable, options = { searchLibrary: true }) {
    // First check stored formulas
    const storedFormula = this.formulas.get(variable);
    if (storedFormula) {
      return {
        name: variable,
        expression: storedFormula,
        source: 'stored'
      };
    }
    
    // Search through stored formulas for ones that contain this variable
    for (const [name, expr] of this.formulas.entries()) {
      const exprVars = this.extractVariables(expr);
      if (exprVars.includes(variable)) {
        return {
          name,
          expression: expr,
          containsVariable: variable,
          source: 'stored'
        };
      }
    }
    
    // Search formula library if enabled
    if (options.searchLibrary) {
      const libraryFormulas = this.getPhysicsFormulas();
      
      for (const formula of libraryFormulas) {
        if (formula.variables.includes(variable) || formula.result === variable) {
          return {
            name: formula.name,
            expression: formula.formula,
            description: formula.description,
            source: 'library'
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Get common physics formulas
   * @returns {Array} - Array of formula objects
   */
  getPhysicsFormulas() {
    return [
      { name: 'Force', formula: 'm * a', result: 'F', variables: ['m', 'a'], description: 'Force = mass × acceleration' },
      { name: 'Kinetic Energy', formula: '0.5 * m * v^2', result: 'KE', variables: ['m', 'v'], description: 'KE = ½mv²' },
      { name: 'Potential Energy', formula: 'm * g * h', result: 'PE', variables: ['m', 'g', 'h'], description: 'PE = mgh' },
      { name: 'Work', formula: 'F * d', result: 'W', variables: ['F', 'd'], description: 'Work = Force × distance' },
      { name: 'Power', formula: 'W / t', result: 'P', variables: ['W', 't'], description: 'Power = Work / time' },
      { name: 'Velocity', formula: 'd / t', result: 'v', variables: ['d', 't'], description: 'Velocity = distance / time' },
      { name: 'Acceleration', formula: '(v - u) / t', result: 'a', variables: ['v', 'u', 't'], description: 'a = Δv / t' },
      { name: 'Momentum', formula: 'm * v', result: 'p', variables: ['m', 'v'], description: 'Momentum = mass × velocity' },
      { name: 'Density', formula: 'm / V', result: 'ρ', variables: ['m', 'V'], description: 'Density = mass / volume' },
      { name: 'Pressure', formula: 'F / A', result: 'P', variables: ['F', 'A'], description: 'Pressure = Force / area' }
    ];
  }

  /**
   * Get common mathematical and scientific constants
   * @returns {Object} - Map of constant names to values
   */
  getCommonConstants() {
    return {
      g: { value: 9.81, description: 'Gravitational acceleration (m/s²)', unit: 'm/s²' },
      c: { value: 299792458, description: 'Speed of light (m/s)', unit: 'm/s' },
      h: { value: 6.62607015e-34, description: 'Planck constant (J⋅s)', unit: 'J⋅s' },
      k: { value: 1.380649e-23, description: 'Boltzmann constant (J/K)', unit: 'J/K' },
      G: { value: 6.67430e-11, description: 'Gravitational constant', unit: 'N⋅m²/kg²' },
      e: { value: 1.602176634e-19, description: 'Elementary charge (C)', unit: 'C' },
      R: { value: 8.314462618, description: 'Gas constant (J/(mol⋅K))', unit: 'J/(mol⋅K)' },
      Na: { value: 6.02214076e23, description: 'Avogadro constant (1/mol)', unit: '1/mol' }
    };
  }

  /**
   * Solve equation with full context awareness
   * @param {string} equation - Equation to solve
   * @param {Object} context - { variables: Map, formulas: Map, nearbyEquations: [] }
   * @returns {Object} - Enhanced result with context information
   */
  solveWithContext(equation, context = {}) {
    const steps = [];
    const usedContext = {
      variables: [],
      formulas: [],
      equations: [],
      suggestions: []
    };
    
    try {
      // Apply context variables temporarily (support both raw value and { value, source } shape)
      if (context.variables) {
        for (const [name, entry] of context.variables) {
          const val = (entry && typeof entry === 'object' && 'value' in entry)
            ? entry.value
            : entry;
          if (!this.variables.has(name)) {
            try {
              this.storeVariable(name, val);
              usedContext.variables.push({ name, value: val, source: (entry && entry.source) ? entry.source : 'spatial' });
            } catch {
              // If storing fails, continue but record suggestion path
            }
          }
        }
      }
      
      // Apply context formulas
      if (context.formulas) {
        for (const [name, formula] of context.formulas) {
          if (!this.formulas.has(name)) {
            this.storeFormula(name, formula.expression || formula);
            usedContext.formulas.push({ name, expression: formula.expression || formula, source: 'spatial' });
          }
        }
      }
      
      steps.push({ action: 'context_applied', context: usedContext });
      
      // Try to solve the equation
      const result = this.solve(equation);
      
      // If solving failed due to missing variables, provide suggestions
      if (!result.success || result.type === 'formula_storage') {
        const suggestions = this.generateSuggestions(equation, result, context);
        usedContext.suggestions = suggestions;
        
        return {
          ...result,
          context: usedContext,
          suggestions
        };
      }
      
      // Add context information to successful result
      return {
        ...result,
        context: usedContext
      };
      
    } catch (error) {
      // Generate suggestions even on error
      const suggestions = this.generateSuggestions(equation, null, context);
      
      return {
        success: false,
        error: error.message,
        steps,
        context: usedContext,
        suggestions
      };
    }
  }

  /**
   * Generate smart suggestions for unsolvable equations
   * @param {string} equation - The equation that couldn't be solved
   * @returns {Array} - Array of suggestion objects
   */
  generateSuggestions(equation) {
    const suggestions = [];
    
    try {
      const parsed = this.parseEquation(equation);
      const allVars = [
        ...this.extractVariables(parsed.left || ''),
        ...this.extractVariables(parsed.right || '')
      ];
      const uniqueVars = [...new Set(allVars)];
      
      // Find missing variables
      const missingVars = uniqueVars.filter(v => !this.variables.has(v));
      
      if (missingVars.length > 0) {
        // Suggest defining missing variables
        missingVars.forEach(varName => {
          suggestions.push({
            type: 'missing_variable',
            message: `Missing variable '${varName}'. Define it nearby or click to add.`,
            variable: varName,
            action: 'define_variable'
          });
          
          // Check if it's a common constant
          const constants = this.getCommonConstants();
          if (constants[varName]) {
            const constant = constants[varName];
            suggestions.push({
              type: 'constant_suggestion',
              message: `Did you mean ${varName} = ${constant.value}? (${constant.description})`,
              variable: varName,
              value: constant.value,
              description: constant.description,
              action: 'use_constant'
            });
          }
          
          // Look for relevant formulas
          const relevantFormula = this.findRelevantFormula(varName);
          if (relevantFormula) {
            suggestions.push({
              type: 'formula_suggestion',
              message: `Found formula: ${relevantFormula.name} = ${relevantFormula.expression}`,
              formula: relevantFormula,
              action: 'use_formula'
            });
          }
        });
      }
      
      // Suggest similar formulas from library
      const physicsFormulas = this.getPhysicsFormulas();
      const matchingFormulas = physicsFormulas.filter(f => 
        uniqueVars.some(v => f.variables.includes(v) || f.result === v)
      );
      
      if (matchingFormulas.length > 0) {
        matchingFormulas.slice(0, 3).forEach(formula => {
          suggestions.push({
            type: 'similar_formula',
            message: `Similar formula: ${formula.description}`,
            formula: formula,
            action: 'use_similar_formula'
          });
        });
      }
      
      // Check for typos or case sensitivity issues
      const storedVars = Array.from(this.variables.keys());
      missingVars.forEach(missing => {
        const similar = storedVars.find(stored => 
          stored.toLowerCase() === missing.toLowerCase()
        );
        if (similar) {
          suggestions.push({
            type: 'typo_suggestion',
            message: `Did you mean '${similar}' instead of '${missing}'?`,
            original: missing,
            suggestion: similar,
            action: 'fix_typo'
          });
        }
      });
      
    } catch (error) {
      // If we can't parse, suggest checking syntax
      suggestions.push({
        type: 'syntax_error',
        message: 'Check equation syntax. Ensure proper operators and parentheses.',
        error: error.message,
        action: 'fix_syntax'
      });
    }
    
    return suggestions;
  }

  /**
   * Calculate confidence level for a solution
   * @param {Object} result - Solve result
   * @param {Object} context - Context used
   * @returns {Object} - { level: 'high'|'medium'|'low', reasons: [] }
   */
  calculateConfidence(result, context) {
    const reasons = [];
    let score = 100;
    
    if (!result.success) {
      return { level: 'none', score: 0, reasons: ['Solution failed'] };
    }
    
    // Reduce confidence if using spatial context
    if (context && context.variables && context.variables.length > 0) {
      const spatialVars = context.variables.filter(v => v.source === 'spatial');
      if (spatialVars.length > 0) {
        score -= 10 * spatialVars.length;
        reasons.push(`Using ${spatialVars.length} variable(s) from nearby equations`);
      }
    }
    
    // Reduce confidence for numerical solutions
    if (result.type === 'numerical_solution') {
      score -= 15;
      reasons.push('Numerical approximation used');
    }
    
    // Reduce confidence if iteration count was high
    if (result.iterations && result.iterations > 50) {
      score -= 10;
      reasons.push('Required many iterations to converge');
    }
    
    // Formula storage is uncertain
    if (result.type === 'formula_storage') {
      score -= 30;
      reasons.push('Formula stored but not evaluated (missing variables)');
    }
    
    // Determine level
    let level;
    if (score >= 90) level = 'high';
    else if (score >= 70) level = 'medium';
    else if (score >= 50) level = 'low';
    else level = 'very-low';
    
    return { level, score, reasons };
  }
}

// Export singleton instance
export const mathEngine = new MathEngine();

// Export class for testing
export { MathEngine };
