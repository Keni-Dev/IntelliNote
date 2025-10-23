import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import GlassCard from '../common/GlassCard';
import GlassButton from '../common/GlassButton';
import GlassInput from '../common/GlassInput';
import ConfirmDialog from '../common/ConfirmDialog';
import Toast from '../common/Toast';

/**
 * Sidebar panel for managing variables and formulas
 */
export default function VariablePanel({
  variables = {},
  formulas = {},
  onSetVariable,
  onDefineFormula,
  onDeleteVariable,
  onDeleteFormula,
  onClearAll
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);
  const [showAddFormula, setShowAddFormula] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [editingFormula, setEditingFormula] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, action: null, title: '', message: '' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form states
  const [varName, setVarName] = useState('');
  const [varValue, setVarValue] = useState('');
  const [formulaName, setFormulaName] = useState('');
  const [formulaExpression, setFormulaExpression] = useState('');

  // Handle add/edit variable
  const handleSaveVariable = () => {
    if (!varName.trim()) {
      setToast({ show: true, message: 'Variable name is required', type: 'error' });
      return;
    }

    const value = parseFloat(varValue);
    if (isNaN(value)) {
      setToast({ show: true, message: 'Invalid value', type: 'error' });
      return;
    }

    const result = onSetVariable(varName.trim(), value);
    if (result && result.success) {
      setToast({ show: true, message: `Variable ${varName} saved`, type: 'success' });
      setVarName('');
      setVarValue('');
      setShowAddVariable(false);
      setEditingVariable(null);
    } else {
      setToast({ show: true, message: result?.error || 'Failed to save variable', type: 'error' });
    }
  };

  // Handle add/edit formula
  const handleSaveFormula = () => {
    if (!formulaName.trim() || !formulaExpression.trim()) {
      setToast({ show: true, message: 'Name and expression are required', type: 'error' });
      return;
    }

    const result = onDefineFormula(formulaName.trim(), formulaExpression.trim());
    if (result && result.success) {
      setToast({ show: true, message: `Formula ${formulaName} saved`, type: 'success' });
      setFormulaName('');
      setFormulaExpression('');
      setShowAddFormula(false);
      setEditingFormula(null);
    } else {
      setToast({ show: true, message: result?.error || 'Failed to save formula', type: 'error' });
    }
  };

  // Handle delete variable
  const handleDeleteVariable = (name) => {
    setConfirmDialog({
      show: true,
      action: () => {
        onDeleteVariable(name);
        setToast({ show: true, message: `Variable ${name} deleted`, type: 'success' });
        setConfirmDialog({ show: false, action: null, title: '', message: '' });
      },
      title: 'Delete Variable',
      message: `Are you sure you want to delete the variable "${name}"?`
    });
  };

  // Handle delete formula
  const handleDeleteFormula = (name) => {
    setConfirmDialog({
      show: true,
      action: () => {
        onDeleteFormula(name);
        setToast({ show: true, message: `Formula ${name} deleted`, type: 'success' });
        setConfirmDialog({ show: false, action: null, title: '', message: '' });
      },
      title: 'Delete Formula',
      message: `Are you sure you want to delete the formula "${name}"?`
    });
  };

  // Handle clear all
  const handleClearAll = () => {
    setConfirmDialog({
      show: true,
      action: () => {
        onClearAll();
        setToast({ show: true, message: 'All data cleared', type: 'success' });
        setConfirmDialog({ show: false, action: null, title: '', message: '' });
      },
      title: 'Clear All',
      message: 'Are you sure you want to clear all variables and formulas? This cannot be undone.'
    });
  };

  // Start editing variable
  const startEditVariable = (name, value) => {
    setEditingVariable(name);
    setVarName(name);
    setVarValue(value.toString());
    setShowAddVariable(true);
  };

  // Start editing formula
  const startEditFormula = (name, expression) => {
    setEditingFormula(name);
    setFormulaName(name);
    setFormulaExpression(expression);
    setShowAddFormula(true);
  };

  // Cancel editing
  const cancelEdit = () => {
    setVarName('');
    setVarValue('');
    setFormulaName('');
    setFormulaExpression('');
    setShowAddVariable(false);
    setShowAddFormula(false);
    setEditingVariable(null);
    setEditingFormula(null);
  };

  const variableCount = Object.keys(variables).length;
  const formulaCount = Object.keys(formulas).length;

  return (
    <>
      <div 
        className={`fixed right-0 h-screen z-20 transition-transform duration-300 ${
          isCollapsed ? 'translate-x-[calc(100%-40px)]' : 'translate-x-0'
        }`}
        style={{ width: '320px', top: '64px', height: 'calc(100vh - 64px)' }}
      >
        <div className="h-full rounded-l-2xl rounded-r-none shadow-2xl border-l-2 border-y-2 border-blue-500/50 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl flex flex-col">
          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-gradient-to-br from-blue-600/90 to-purple-600/90 backdrop-blur-xl border-2 border-blue-500/50 border-r-0 rounded-l-lg p-2 hover:from-blue-500/90 hover:to-purple-500/90 transition-all shadow-lg"
          >
            {isCollapsed ? (
              <ChevronLeft className="w-5 h-5 text-white" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Panel Content */}
          <div className={`flex-1 flex flex-col overflow-hidden ${isCollapsed ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
            {/* Header */}
            <div className="p-4 border-b border-white/20">
              <h2 className="text-lg font-bold text-white mb-1">Math Context</h2>
              <p className="text-xs text-blue-200">
                {variableCount} variable{variableCount !== 1 ? 's' : ''}, {formulaCount} formula{formulaCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Variables Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">Variables</h3>
                  <button
                    onClick={() => setShowAddVariable(!showAddVariable)}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                    title="Add variable"
                  >
                    <Plus className="w-4 h-4 text-blue-300" />
                  </button>
                </div>

                {/* Add/Edit Variable Form */}
                {showAddVariable && (
                  <div className="mb-3 p-3 bg-black/30 rounded-lg space-y-2 animate-slideIn">
                    <GlassInput
                      value={varName}
                      onChange={(e) => setVarName(e.target.value)}
                      placeholder="Variable name (e.g., x)"
                      disabled={editingVariable !== null}
                    />
                    <GlassInput
                      value={varValue}
                      onChange={(e) => setVarValue(e.target.value)}
                      placeholder="Value (e.g., 5)"
                      type="number"
                      step="any"
                    />
                    <div className="flex gap-2">
                      <GlassButton
                        onClick={handleSaveVariable}
                        variant="primary"
                        className="flex-1 py-1 text-sm"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Save
                      </GlassButton>
                      <GlassButton
                        onClick={cancelEdit}
                        variant="secondary"
                        className="flex-1 py-1 text-sm"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </GlassButton>
                    </div>
                  </div>
                )}

                {/* Variables List */}
                <div className="space-y-2">
                  {variableCount === 0 && !showAddVariable ? (
                    <div className="text-xs text-gray-400 text-center py-4">
                      No variables yet
                    </div>
                  ) : (
                    Object.entries(variables).map(([name, value]) => (
                      <div
                        key={name}
                        className="p-2 bg-black/20 rounded-lg flex items-center justify-between group hover:bg-black/30 transition-colors text-white"
                      >
                        <div className="flex-1">
                          <InlineMath math={`${name} = ${value}`} />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditVariable(name, value)}
                            className="p-1 rounded hover:bg-white/20 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3 text-blue-300" />
                          </button>
                          <button
                            onClick={() => handleDeleteVariable(name)}
                            className="p-1 rounded hover:bg-white/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Formulas Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">Formulas</h3>
                  <button
                    onClick={() => setShowAddFormula(!showAddFormula)}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                    title="Add formula"
                  >
                    <Plus className="w-4 h-4 text-blue-300" />
                  </button>
                </div>

                {/* Add/Edit Formula Form */}
                {showAddFormula && (
                  <div className="mb-3 p-3 bg-black/30 rounded-lg space-y-2 animate-slideIn">
                    <GlassInput
                      value={formulaName}
                      onChange={(e) => setFormulaName(e.target.value)}
                      placeholder="Formula name (e.g., f)"
                      disabled={editingFormula !== null}
                    />
                    <GlassInput
                      value={formulaExpression}
                      onChange={(e) => setFormulaExpression(e.target.value)}
                      placeholder="Expression (e.g., x^2 + 2x)"
                    />
                    <div className="flex gap-2">
                      <GlassButton
                        onClick={handleSaveFormula}
                        variant="primary"
                        className="flex-1 py-1 text-sm"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Save
                      </GlassButton>
                      <GlassButton
                        onClick={cancelEdit}
                        variant="secondary"
                        className="flex-1 py-1 text-sm"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </GlassButton>
                    </div>
                  </div>
                )}

                {/* Formulas List */}
                <div className="space-y-2">
                  {formulaCount === 0 && !showAddFormula ? (
                    <div className="text-xs text-gray-400 text-center py-4">
                      No formulas yet
                    </div>
                  ) : (
                    Object.entries(formulas).map(([name, expression]) => (
                      <div
                        key={name}
                        className="p-2 bg-black/20 rounded-lg group hover:bg-black/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-mono text-xs text-blue-300">{name}</div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditFormula(name, expression)}
                              className="p-1 rounded hover:bg-white/20 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3 text-blue-300" />
                            </button>
                            <button
                              onClick={() => handleDeleteFormula(name)}
                              className="p-1 rounded hover:bg-white/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-white">
                          <InlineMath math={expression} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t-2 border-white/30 sticky bottom-0 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl shadow-2xl">
              <GlassButton
                onClick={handleClearAll}
                variant="danger"
                className="w-full h-12"
                disabled={variableCount === 0 && formulaCount === 0}
              >
                <Trash2 className="w-4 h-4 relative z-10" />
                <span className="text-sm font-semibold relative z-10">Clear All</span>
              </GlassButton>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.show && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.action}
          onCancel={() => setConfirmDialog({ show: false, action: null, title: '', message: '' })}
        />
      )}

      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={() => setToast({ show: false, message: '', type: 'success' })}
      />
    </>
  );
}
