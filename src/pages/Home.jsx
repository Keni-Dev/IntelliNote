import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useIndexedDB } from '../hooks/useIndexedDB';
import useDebounce from '../hooks/useDebounce';
import { GlassButton, ConfirmDialog, Toast, SearchBar } from '../components/common';
import { NotebookCard, NotebookModal } from '../components/notebook';

/**
 * Home Page - Displays all notebooks in a responsive grid
 * Features:
 * - Fetch and display all notebooks using useIndexedDB
 * - Create, edit, delete, and duplicate notebooks
 * - Navigate to notebook view
 * - Loading, empty, and error states
 * - Toast notifications for user feedback
 * - Smooth animations with framer-motion
 */
function Home() {
  const navigate = useNavigate();
  const { 
    notebooks, 
    loading, 
    error, 
    createNotebook,
    updateNotebook,
    deleteNotebook,
    refreshNotebooks
  } = useIndexedDB();

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Other states
  const [noteCounts, setNoteCounts] = useState({});

  // Count notes for each notebook
  useEffect(() => {
    const countNotes = async () => {
      const counts = {};
      for (const notebook of notebooks) {
        counts[notebook.id] = 0;
      }
      setNoteCounts(counts);
    };

    if (notebooks.length > 0) {
      countNotes();
    }
  }, [notebooks]);

  // Filter notebooks based on search query
  const filteredNotebooks = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return notebooks;
    }
    
    const query = debouncedSearch.toLowerCase();
    return notebooks.filter(notebook => 
      notebook.name.toLowerCase().includes(query)
    );
  }, [notebooks, debouncedSearch]);

  // Handle search change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle search clear
  const handleSearchClear = () => {
    setSearchQuery('');
  };

  // Open modal for creating new notebook
  const handleCreateNew = () => {
    setSelectedNotebook(null);
    setShowModal(true);
  };

  // Open modal for editing existing notebook
  const handleEditNotebook = (notebook, e) => {
    e?.stopPropagation(); // Prevent navigation when editing
    setSelectedNotebook(notebook);
    setShowModal(true);
  };

  // Handle save (create or update)
  const handleSave = async (name, color) => {
    setIsSaving(true);
    try {
      if (selectedNotebook) {
        // Update existing notebook
        await updateNotebook(selectedNotebook.id, { name, color });
        setToast({ message: 'Notebook updated successfully!', type: 'success' });
      } else {
        // Create new notebook
        const notebookId = await createNotebook(name, color);
        setToast({ message: 'Notebook created successfully!', type: 'success' });
        // Navigate to the new notebook
        navigate(`/notebook/${notebookId}`);
      }
      await refreshNotebooks();
      setShowModal(false);
      setSelectedNotebook(null);
    } catch (err) {
      console.error('Failed to save notebook:', err);
      setToast({ message: 'Failed to save notebook. Please try again.', type: 'error' });
      throw err; // Re-throw to let modal handle error display
    } finally {
      setIsSaving(false);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedNotebook(null);
  };

  // Handle delete request
  const handleDeleteRequest = (notebook, e) => {
    e?.stopPropagation();
    setNotebookToDelete(notebook);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!notebookToDelete) return;

    setIsDeleting(true);
    try {
      await deleteNotebook(notebookToDelete.id);
      await refreshNotebooks();
      setToast({ 
        message: `"${notebookToDelete.name}" deleted successfully`, 
        type: 'success' 
      });
      setShowDeleteDialog(false);
      setNotebookToDelete(null);
    } catch (err) {
      console.error('Failed to delete notebook:', err);
      setToast({ 
        message: 'Failed to delete notebook. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle duplicate notebook
  const handleDuplicate = async (notebook, e) => {
    e?.stopPropagation();
    
    try {
      // Create a copy with "(Copy)" suffix
      const copyName = `${notebook.name} (Copy)`;
      const notebookId = await createNotebook(copyName, notebook.color);
      await refreshNotebooks();
      setToast({ 
        message: `"${copyName}" created successfully`, 
        type: 'success' 
      });
      
      // Navigate to the duplicated notebook
      navigate(`/notebook/${notebookId}`);
    } catch (err) {
      console.error('Failed to duplicate notebook:', err);
      setToast({ 
        message: 'Failed to duplicate notebook. Please try again.', 
        type: 'error' 
      });
    }
  };

  // Handle notebook click
  const handleNotebookClick = (notebookId) => {
    navigate(`/notebook/${notebookId}`);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const emptyStateVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-8 sm:mb-12"
          variants={headerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                    IntelliNote
                  </span>
                </h1>
                <p className="text-text-secondary text-base sm:text-lg">
                  Your intelligent note-taking companion
                </p>
              </div>
              <GlassButton 
                onClick={handleCreateNew}
                className="w-full sm:w-auto"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Notebook
                </span>
              </GlassButton>
            </div>
            
            {/* Search Bar */}
            {notebooks.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <SearchBar
                  placeholder="Search notebooks..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClear={handleSearchClear}
                  className="flex-1"
                />
                {searchQuery && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-text-secondary text-sm sm:text-base whitespace-nowrap"
                  >
                    {filteredNotebooks.length} {filteredNotebooks.length === 1 ? 'notebook' : 'notebooks'} found
                  </motion.p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-100"
          >
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Error loading notebooks</p>
                <p className="text-sm opacity-90">{error.message}</p>
                <button 
                  onClick={refreshNotebooks}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && notebooks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <p className="mt-6 text-text-secondary text-lg">Loading notebooks...</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && notebooks.length === 0 && !error && (
          <motion.div
            variants={emptyStateVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 max-w-md text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-3">
                No notebooks yet
              </h3>
              <p className="text-text-secondary mb-6">
                Create your first notebook to start organizing your notes with AI-powered features!
              </p>
              <GlassButton 
                onClick={handleCreateNew}
                className="w-full"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Notebook
                </span>
              </GlassButton>
            </div>
          </motion.div>
        )}

        {/* Empty Search Results */}
        {!loading && notebooks.length > 0 && filteredNotebooks.length === 0 && searchQuery && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 max-w-md text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-3">
                No notebooks found
              </h3>
              <p className="text-text-secondary mb-6">
                No notebooks match &quot;{searchQuery}&quot;. Try a different search term.
              </p>
              <GlassButton 
                onClick={handleSearchClear}
                variant="secondary"
                className="w-full"
              >
                Clear Search
              </GlassButton>
            </div>
          </motion.div>
        )}

        {/* Notebooks Grid */}
        {!loading && filteredNotebooks.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            {filteredNotebooks.map((notebook, index) => (
              <NotebookCard
                key={notebook.id}
                notebook={notebook}
                noteCount={noteCounts[notebook.id] || 0}
                onClick={() => handleNotebookClick(notebook.id)}
                onEdit={(e) => handleEditNotebook(notebook, e)}
                onDelete={(e) => handleDeleteRequest(notebook, e)}
                onDuplicate={(e) => handleDuplicate(notebook, e)}
                index={index}
              />
            ))}
          </motion.div>
        )}

        {/* Notebook Modal (Create/Edit) */}
        <NotebookModal
          isOpen={showModal}
          onClose={handleCloseModal}
          notebook={selectedNotebook}
          onSave={handleSave}
          isSaving={isSaving}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setNotebookToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Notebook"
          message={`Are you sure you want to delete "${notebookToDelete?.name}"? All notes in this notebook will also be deleted.`}
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={isDeleting}
          variant="danger"
        />

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            duration={3000}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}

export default Home;
