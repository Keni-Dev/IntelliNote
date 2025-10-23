import { useState, useEffect, useCallback } from 'react';
import { MathEngine } from '../lib/mathEngine';

/**
 * Custom hook for integrating math solving capabilities with canvas
 * Manages MathEngine instance and solving context per note
 */
export function useMathSolver(noteId) {
  const [engine, setEngine] = useState(null);
  const [variables, setVariables] = useState({});
  const [formulas, setFormulas] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load previous solving context from database
   */
  const loadContext = useCallback(async (id, mathEngine) => {
    try {
      setIsLoading(true);
      const db = await openDatabase();
      const transaction = db.transaction(['mathContexts'], 'readonly');
      const store = transaction.objectStore('mathContexts');
      const request = store.get(id);

      request.onsuccess = () => {
        const context = request.result;
        if (context) {
          // Restore variables
          if (context.variables) {
            Object.entries(context.variables).forEach(([name, value]) => {
              mathEngine.storeVariable(name, value);
            });
            setVariables(context.variables);
          }
          
          // Restore formulas
          if (context.formulas) {
            Object.entries(context.formulas).forEach(([name, expression]) => {
              mathEngine.storeFormula(name, expression);
            });
            setFormulas(context.formulas);
          }
        }
        setIsLoading(false);
      };

      request.onerror = () => {
        console.error('Failed to load math context');
        setIsLoading(false);
      };
    } catch (error) {
      console.error('Error loading context:', error);
      setIsLoading(false);
    }
  }, []);

  // Initialize MathEngine instance
  useEffect(() => {
    const mathEngine = new MathEngine();
    setEngine(mathEngine);
    
    // Load context from database if noteId exists
    if (noteId) {
      loadContext(noteId, mathEngine);
    } else {
      setIsLoading(false);
    }
  }, [noteId, loadContext]);

  /**
   * Save current context to database
   */
  const saveContext = useCallback(async () => {
    if (!noteId || !engine) return;

    try {
      const db = await openDatabase();
      const transaction = db.transaction(['mathContexts'], 'readwrite');
      const store = transaction.objectStore('mathContexts');
      
      const context = {
        id: noteId,
        variables: variables,
        formulas: formulas,
        updatedAt: new Date().toISOString()
      };

      store.put(context);
    } catch (error) {
      console.error('Error saving context:', error);
    }
  }, [noteId, engine, variables, formulas]);

  /**
   * Open IndexedDB database
   */
  const openDatabase = () => {
    return new Promise((resolve, reject) => {
      // Open without specifying version to use the latest version
      const request = indexedDB.open('IntelliNoteDB');

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create mathContexts store if it doesn't exist
        if (!db.objectStoreNames.contains('mathContexts')) {
          db.createObjectStore('mathContexts', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        
        // Check if mathContexts store exists, if not we need to upgrade
        if (!db.objectStoreNames.contains('mathContexts')) {
          db.close();
          // Request upgrade by opening with a higher version
          const upgradeRequest = indexedDB.open('IntelliNoteDB', db.version + 1);
          
          upgradeRequest.onupgradeneeded = (event) => {
            const upgradeDb = event.target.result;
            if (!upgradeDb.objectStoreNames.contains('mathContexts')) {
              upgradeDb.createObjectStore('mathContexts', { keyPath: 'id' });
            }
          };
          
          upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);
          upgradeRequest.onerror = () => reject(upgradeRequest.error);
        } else {
          resolve(db);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Detect if text contains an equation (has "=" sign)
   */
  const detectEquation = useCallback((text) => {
    if (!text || typeof text !== 'string') return false;
    
    // Check for equals sign, but exclude comparison operators
    const hasEquals = text.includes('=');
    const isComparison = text.includes('==') || text.includes('!=') || 
                         text.includes('<=') || text.includes('>=');
    
    return hasEquals && !isComparison;
  }, []);

  /**
   * Solve an equation using the math engine
   */
  const solveEquation = useCallback((equation) => {
    if (!engine) {
      return {
        success: false,
        error: 'Math engine not initialized'
      };
    }

    try {
      const result = engine.solve(equation);
      
      // Update stored variables and formulas
      const varsMap = engine.getAllVariables();
      const formulasMap = engine.getAllFormulas();
      
      // Convert Maps to plain objects
      const newVariables = Object.fromEntries(varsMap);
      const newFormulas = Object.fromEntries(formulasMap);
      
      setVariables(newVariables);
      setFormulas(newFormulas);
      
      // Save context to database
      setTimeout(() => saveContext(), 100);
      
      return {
        success: true,
        result: result,
        variables: newVariables,
        formulas: newFormulas
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }, [engine, saveContext]);

  /**
   * Evaluate an expression using current context
   */
  const evaluateExpression = useCallback((expression) => {
    if (!engine) {
      return {
        success: false,
        error: 'Math engine not initialized'
      };
    }

    try {
      const result = engine.evaluate(expression);
      return {
        success: true,
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }, [engine]);

  /**
   * Solve with spatial context using the same engine instance
   */
  const solveWithContext = useCallback((equation, context = {}) => {
    if (!engine) {
      return { success: false, error: 'Math engine not initialized' };
    }
    try {
      const result = engine.solveWithContext(equation, context);
      // After solving, refresh local copies of variables/formulas
      setVariables(Object.fromEntries(engine.getAllVariables()));
      setFormulas(Object.fromEntries(engine.getAllFormulas()));
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [engine]);

  /**
   * Confidence helper passthrough
   */
  const calculateConfidence = useCallback((result, context) => {
    if (!engine) return { level: 'none', score: 0, reasons: ['Math engine not initialized'] };
    return engine.calculateConfidence(result, context);
  }, [engine]);

  /**
   * Get all stored variables
   */
  const getStoredVariables = useCallback(() => {
    return variables;
  }, [variables]);

  /**
   * Get all stored formulas
   */
  const getStoredFormulas = useCallback(() => {
    return formulas;
  }, [formulas]);

  /**
   * Set a variable manually
   */
  const setVariable = useCallback((name, value) => {
    if (!engine) return { success: false, error: 'Math engine not initialized' };

    try {
      engine.storeVariable(name, value);
      const varsMap = engine.getAllVariables();
      const newVariables = Object.fromEntries(varsMap);
      setVariables(newVariables);
      saveContext();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [engine, saveContext]);

  /**
   * Define a formula manually
   */
  const defineFormula = useCallback((name, expression) => {
    if (!engine) return { success: false, error: 'Math engine not initialized' };

    try {
      engine.storeFormula(name, expression);
      const formulasMap = engine.getAllFormulas();
      const newFormulas = Object.fromEntries(formulasMap);
      setFormulas(newFormulas);
      saveContext();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [engine, saveContext]);

  /**
   * Delete a variable
   */
  const deleteVariable = useCallback((name) => {
    if (!engine) return;

    const newVariables = { ...variables };
    delete newVariables[name];
    
    // Recreate engine with updated variables
    const newEngine = new MathEngine();
    Object.entries(newVariables).forEach(([n, v]) => {
      newEngine.storeVariable(n, v);
    });
    Object.entries(formulas).forEach(([n, e]) => {
      newEngine.storeFormula(n, e);
    });
    
    setEngine(newEngine);
    setVariables(newVariables);
    saveContext();
  }, [engine, variables, formulas, saveContext]);

  /**
   * Delete a formula
   */
  const deleteFormula = useCallback((name) => {
    if (!engine) return;

    const newFormulas = { ...formulas };
    delete newFormulas[name];
    
    // Recreate engine with updated formulas
    const newEngine = new MathEngine();
    Object.entries(variables).forEach(([n, v]) => {
      newEngine.storeVariable(n, v);
    });
    Object.entries(newFormulas).forEach(([n, e]) => {
      newEngine.storeFormula(n, e);
    });
    
    setEngine(newEngine);
    setFormulas(newFormulas);
    saveContext();
  }, [engine, variables, formulas, saveContext]);

  /**
   * Clear all stored data (variables and formulas)
   */
  const clearContext = useCallback(async () => {
    if (!engine) return;

    // Create new engine instance
    const newEngine = new MathEngine();
    setEngine(newEngine);
    setVariables({});
    setFormulas({});

    // Clear from database
    if (noteId) {
      try {
        const db = await openDatabase();
        const transaction = db.transaction(['mathContexts'], 'readwrite');
        const store = transaction.objectStore('mathContexts');
        store.delete(noteId);
      } catch (error) {
        console.error('Error clearing context:', error);
      }
    }
  }, [engine, noteId]);

  return {
    // State
    isLoading,
    variables,
    formulas,
    
    // Methods
    detectEquation,
    solveEquation,
    solveWithContext,
    calculateConfidence,
    evaluateExpression,
    getStoredVariables,
    getStoredFormulas,
    setVariable,
    defineFormula,
    deleteVariable,
    deleteFormula,
    clearContext
  };
}

export default useMathSolver;
