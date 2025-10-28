import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useIndexedDB } from '../hooks/useIndexedDB';
import useDebounce from '../hooks/useDebounce';
import { GlassButton, ConfirmDialog, Toast, SearchBar } from '../components/common';
import { NoteCard, NoteModal } from '../components/note';

/**
 * NotebookView Page - Displays all notes within a notebook
 * Features:
 * - Display notebook details with color accent
 * - Grid of note cards with preview
 * - Create, edit, delete, and duplicate notes
 * - Sort options (Recent, Oldest, A-Z)
 * - Navigate to editor
 * - Loading, empty, and error states
 */
function NotebookView() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { 
    getNotebook,
    notes,
    loading,
    error,
    refreshNotes,
    createNote,
    updateNote,
    deleteNote
  } = useIndexedDB();

  // States
  const [notebook, setNotebook] = useState(null);
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'oldest', 'a-z', 'z-a'
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  // Load notebook and notes
  useEffect(() => {
    const loadNotebookData = async () => {
      try {
        const notebookData = await getNotebook(parseInt(notebookId));
        if (!notebookData) {
          setToast({ message: 'Notebook not found', type: 'error' });
          navigate('/');
          return;
        }
        setNotebook(notebookData);
        await refreshNotes(parseInt(notebookId));
      } catch (err) {
        console.error('Error loading notebook:', err);
        setToast({ message: 'Failed to load notebook', type: 'error' });
      }
    };

    if (notebookId) {
      loadNotebookData();
    }
  }, [notebookId, getNotebook, refreshNotes, navigate]);

  // Sort notes
  const sortedNotes = useMemo(() => {
    if (!notes || notes.length === 0) return [];

    const notesCopy = [...notes];
    
    switch (sortBy) {
      case 'oldest':
        return notesCopy.sort((a, b) => 
          new Date(a.updatedAt) - new Date(b.updatedAt)
        );
      case 'a-z':
        return notesCopy.sort((a, b) => 
          (a.title || 'Untitled').localeCompare(b.title || 'Untitled')
        );
      case 'z-a':
        return notesCopy.sort((a, b) => 
          (b.title || 'Untitled').localeCompare(a.title || 'Untitled')
        );
      case 'recent':
      default:
        return notesCopy.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }
  }, [notes, sortBy]);

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return sortedNotes;
    }
    
    const query = debouncedSearch.toLowerCase();
    return sortedNotes.filter(note => 
      (note.title || 'Untitled Note').toLowerCase().includes(query)
    );
  }, [sortedNotes, debouncedSearch]);

  // Handle search change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle search clear
  const handleSearchClear = () => {
    setSearchQuery('');
  };

  // Handle create new note
  const handleCreateNew = () => {
    setSelectedNote(null);
    setShowNoteModal(true);
  };

  // Handle edit note title
  const handleEditNote = (note, e) => {
    e?.stopPropagation();
    setSelectedNote(note);
    setShowNoteModal(true);
  };

  // Handle save note (create or update)
  const handleSaveNote = async (title, noteType = 'auto') => {
    setIsSaving(true);
    try {
      if (selectedNote) {
        // Update existing note
        await updateNote(selectedNote.id, { title, noteType });
        await refreshNotes(parseInt(notebookId));
        setToast({ message: 'Note updated successfully!', type: 'success' });
        setShowNoteModal(false);
        setSelectedNote(null);
      } else {
        // Create new note
        const noteId = await createNote(parseInt(notebookId), title, noteType);
        await refreshNotes(parseInt(notebookId));
        setToast({ message: 'Note created successfully!', type: 'success' });
        setShowNoteModal(false);
        
        // Navigate to editor
        navigate(`/editor/${notebookId}/${noteId}`);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
      setToast({ message: 'Failed to save note. Please try again.', type: 'error' });
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle note click - navigate to editor
  const handleNoteClick = (noteId) => {
    navigate(`/editor/${notebookId}/${noteId}`);
  };

  // Handle delete request
  const handleDeleteRequest = (note, e) => {
    e?.stopPropagation();
    setNoteToDelete(note);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;

    setIsDeleting(true);
    try {
      await deleteNote(noteToDelete.id, parseInt(notebookId));
      await refreshNotes(parseInt(notebookId));
      setToast({ 
        message: `"${noteToDelete.title}" deleted successfully`, 
        type: 'success' 
      });
      setShowDeleteDialog(false);
      setNoteToDelete(null);
    } catch (err) {
      console.error('Failed to delete note:', err);
      setToast({ 
        message: 'Failed to delete note. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle duplicate note
  const handleDuplicate = async (note, e) => {
    e?.stopPropagation();
    
    try {
      const copyTitle = `${note.title} (Copy)`;
      const noteId = await createNote(parseInt(notebookId), copyTitle);
      await refreshNotes(parseInt(notebookId));
      setToast({ 
        message: `"${copyTitle}" created successfully`, 
        type: 'success' 
      });
      
      // Navigate to duplicated note
      navigate(`/editor/${notebookId}/${noteId}`);
    } catch (err) {
      console.error('Failed to duplicate note:', err);
      setToast({ 
        message: 'Failed to duplicate note. Please try again.', 
        type: 'error' 
      });
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
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
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Link to="/">
            <GlassButton variant="secondary" className="inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Notebooks
            </GlassButton>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div 
          className="mb-8"
          variants={headerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Notebook color indicator */}
                {notebook && (
                  <div 
                    className="w-3 h-16 rounded-full"
                    style={{ backgroundColor: notebook.color }}
                  />
                )}
                <div>
                  <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-2">
                    {notebook?.name || 'Loading...'}
                  </h1>
                  <p className="text-text-secondary text-base sm:text-lg">
                    {sortedNotes.length} {sortedNotes.length === 1 ? 'note' : 'notes'}
                  </p>
                </div>
              </div>
              
              <GlassButton onClick={handleCreateNew} className="w-full sm:w-auto">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Note
                </span>
              </GlassButton>
            </div>

            {/* Search Bar and Sort Dropdown */}
            {sortedNotes.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <SearchBar
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClear={handleSearchClear}
                  className="flex-1"
                />
                <div className="flex items-center gap-3">
                  {/* Sort Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2.5 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                    <option value="a-z">A-Z</option>
                    <option value="z-a">Z-A</option>
                  </select>
                  
                  {/* Result count when searching */}
                  {searchQuery && (
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-text-secondary text-sm whitespace-nowrap hidden sm:block"
                    >
                      {filteredNotes.length} found
                    </motion.p>
                  )}
                </div>
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
                <p className="font-medium">Error loading notes</p>
                <p className="text-sm opacity-90">{error.message}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && sortedNotes.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
            <p className="mt-6 text-text-secondary text-lg">Loading notes...</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && sortedNotes.length === 0 && !error && (
          <motion.div
            variants={emptyStateVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 max-w-md text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-3">
                No notes yet
              </h3>
              <p className="text-text-secondary mb-6">
                Start your first note to begin capturing ideas, equations, and diagrams!
              </p>
              <GlassButton onClick={handleCreateNew} className="w-full">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Note
                </span>
              </GlassButton>
            </div>
          </motion.div>
        )}

        {/* Empty Search Results */}
        {!loading && sortedNotes.length > 0 && filteredNotes.length === 0 && searchQuery && (
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
                No notes found
              </h3>
              <p className="text-text-secondary mb-6">
                No notes match &quot;{searchQuery}&quot;. Try a different search term.
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

        {/* Notes Grid */}
        {!loading && filteredNotes.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            {filteredNotes.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => handleNoteClick(note.id)}
                onEdit={(e) => handleEditNote(note, e)}
                onDelete={(e) => handleDeleteRequest(note, e)}
                onDuplicate={(e) => handleDuplicate(note, e)}
                index={index}
              />
            ))}
          </motion.div>
        )}

        {/* Note Modal (Create/Edit) */}
        <NoteModal
          isOpen={showNoteModal}
          onClose={() => {
            setShowNoteModal(false);
            setSelectedNote(null);
          }}
          note={selectedNote}
          onSave={handleSaveNote}
          isSaving={isSaving}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setNoteToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Note"
          message={`Are you sure you want to delete "${noteToDelete?.title}"? This action cannot be undone.`}
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

export default NotebookView;
