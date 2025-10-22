/**
 * Canvas History Manager
 * Manages undo/redo functionality by tracking individual actions/objects
 */
class CanvasHistory {
  constructor(maxHistory = 50) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = maxHistory;
    this.isPerformingUndoRedo = false;
  }

  /**
   * Record an action (add/remove/modify object)
   * @param {Object} action - Action object with type and data
   */
  recordAction(action) {
    if (this.isPerformingUndoRedo) {
      return;
    }

    // Add to undo stack
    this.undoStack.push(action);

    // Limit stack size
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    // Clear redo stack when new action is recorded
    this.redoStack = [];
  }

  /**
   * Undo the last action
   * @returns {Object|null} - Action to undo or null if no undo available
   */
  undo() {
    if (!this.canUndo()) {
      return null;
    }

    this.isPerformingUndoRedo = true;

    // Get last action from undo stack
    const action = this.undoStack.pop();

    // Save to redo stack
    this.redoStack.push(action);

    this.isPerformingUndoRedo = false;

    return action;
  }

  /**
   * Redo the last undone action
   * @returns {Object|null} - Action to redo or null if no redo available
   */
  redo() {
    if (!this.canRedo()) {
      return null;
    }

    this.isPerformingUndoRedo = true;

    // Get last action from redo stack
    const action = this.redoStack.pop();

    // Save back to undo stack
    this.undoStack.push(action);

    this.isPerformingUndoRedo = false;

    return action;
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.isPerformingUndoRedo = false;
  }

  /**
   * Get the number of undo states available
   * @returns {number}
   */
  getUndoCount() {
    return this.undoStack.length;
  }

  /**
   * Get the number of redo states available
   * @returns {number}
   */
  getRedoCount() {
    return this.redoStack.length;
  }

  /**
   * Check if currently performing undo/redo
   * @returns {boolean}
   */
  isUndoRedoInProgress() {
    return this.isPerformingUndoRedo;
  }
}

export default CanvasHistory;
