import { useState, useEffect, useCallback } from 'react'
import {
  getNotebooks,
  getNotebookById,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  getNotesByNotebook,
  getNoteById,
  createNote,
  updateNote,
  saveNoteCanvas,
  deleteNote,
  addPendingSync,
  getPendingSync,
  clearPendingSync,
  getDatabaseStats,
  clearAllData
} from '../lib/db'

/**
 * Custom React hook for IndexedDB operations
 * Provides easy access to all database functions with loading and error states
 * 
 * @returns {Object} Database operations and state
 * @property {Array} notebooks - Array of all notebooks
 * @property {Array} notes - Array of notes (filtered by current notebook if applicable)
 * @property {boolean} loading - Loading state for database operations
 * @property {Error|null} error - Error object if an operation failed
 * @property {Object} stats - Database statistics (notebooks, notes, pendingSync counts)
 * @property {Function} refreshNotebooks - Manually refresh notebooks list
 * @property {Function} refreshNotes - Manually refresh notes list for a notebook
 * @property {Function} refreshStats - Manually refresh database stats
 * @property {Function} createNotebook - Create a new notebook
 * @property {Function} getNotebook - Get a specific notebook by ID
 * @property {Function} updateNotebook - Update a notebook
 * @property {Function} deleteNotebook - Delete a notebook
 * @property {Function} createNote - Create a new note
 * @property {Function} getNote - Get a specific note by ID
 * @property {Function} updateNote - Update a note
 * @property {Function} saveCanvas - Save canvas data for a note
 * @property {Function} deleteNote - Delete a note
 * @property {Function} clearDatabase - Clear all database data
 * 
 * @example
 * const { notebooks, loading, error, createNotebook } = useIndexedDB()
 * 
 * // Create a notebook
 * await createNotebook('My Notes', '#6366f1')
 */
export const useIndexedDB = () => {
  const [notebooks, setNotebooks] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ notebooks: 0, notes: 0, pendingSync: 0 })

  /**
   * Refreshes the notebooks list from the database
   */
  const refreshNotebooks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedNotebooks = await getNotebooks()
      setNotebooks(fetchedNotebooks)
    } catch (err) {
      console.error('Error refreshing notebooks:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Refreshes the notes list for a specific notebook
   * @param {number} notebookId - The notebook ID
   */
  const refreshNotes = useCallback(async (notebookId) => {
    if (!notebookId) {
      setNotes([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const fetchedNotes = await getNotesByNotebook(notebookId)
      setNotes(fetchedNotes)
    } catch (err) {
      console.error('Error refreshing notes:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Refreshes database statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const dbStats = await getDatabaseStats()
      setStats(dbStats)
    } catch (err) {
      console.error('Error refreshing stats:', err)
    }
  }, [])

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [fetchedNotebooks, dbStats] = await Promise.all([
          getNotebooks(),
          getDatabaseStats()
        ])
        setNotebooks(fetchedNotebooks)
        setStats(dbStats)
      } catch (err) {
        console.error('Error loading initial data:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // ==================== NOTEBOOK OPERATIONS ====================

  /**
   * Creates a new notebook
   * @param {string} name - Notebook name
   * @param {string} [color='#6366f1'] - Notebook color
   * @returns {Promise<number>} The created notebook ID
   */
  const handleCreateNotebook = useCallback(async (name, color = '#6366f1') => {
    try {
      setError(null)
      const id = await createNotebook(name, color)
      await refreshNotebooks()
      await refreshStats()
      return id
    } catch (err) {
      console.error('Error creating notebook:', err)
      setError(err)
      throw err
    }
  }, [refreshNotebooks, refreshStats])

  /**
   * Gets a specific notebook by ID
   * @param {number} id - Notebook ID
   * @returns {Promise<Object|undefined>} The notebook object
   */
  const handleGetNotebook = useCallback(async (id) => {
    try {
      setError(null)
      return await getNotebookById(id)
    } catch (err) {
      console.error('Error getting notebook:', err)
      setError(err)
      throw err
    }
  }, [])

  /**
   * Updates a notebook
   * @param {number} id - Notebook ID
   * @param {Object} updates - Properties to update
   * @returns {Promise<number>} Number of updated records
   */
  const handleUpdateNotebook = useCallback(async (id, updates) => {
    try {
      setError(null)
      const count = await updateNotebook(id, updates)
      await refreshNotebooks()
      return count
    } catch (err) {
      console.error('Error updating notebook:', err)
      setError(err)
      throw err
    }
  }, [refreshNotebooks])

  /**
   * Deletes a notebook and all its notes
   * @param {number} id - Notebook ID
   * @returns {Promise<void>}
   */
  const handleDeleteNotebook = useCallback(async (id) => {
    try {
      setError(null)
      await deleteNotebook(id)
      await refreshNotebooks()
      await refreshStats()
    } catch (err) {
      console.error('Error deleting notebook:', err)
      setError(err)
      throw err
    }
  }, [refreshNotebooks, refreshStats])

  // ==================== NOTE OPERATIONS ====================

  /**
   * Creates a new note in a notebook
   * @param {number} notebookId - Parent notebook ID
   * @param {string} [title='Untitled Note'] - Note title
   * @returns {Promise<number>} The created note ID
   */
  const handleCreateNote = useCallback(async (notebookId, title = 'Untitled Note') => {
    try {
      setError(null)
      const id = await createNote(notebookId, title)
      await refreshNotes(notebookId)
      await refreshStats()
      return id
    } catch (err) {
      console.error('Error creating note:', err)
      setError(err)
      throw err
    }
  }, [refreshNotes, refreshStats])

  /**
   * Gets a specific note by ID
   * @param {number} id - Note ID
   * @returns {Promise<Object|undefined>} The note object
   */
  const handleGetNote = useCallback(async (id) => {
    try {
      setError(null)
      return await getNoteById(id)
    } catch (err) {
      console.error('Error getting note:', err)
      setError(err)
      throw err
    }
  }, [])

  /**
   * Updates a note
   * @param {number} id - Note ID
   * @param {Object} updates - Properties to update
   * @returns {Promise<number>} Number of updated records
   */
  const handleUpdateNote = useCallback(async (id, updates) => {
    try {
      setError(null)
      const count = await updateNote(id, updates)
      const note = await getNoteById(id)
      if (note) {
        await refreshNotes(note.notebookId)
      }
      return count
    } catch (err) {
      console.error('Error updating note:', err)
      setError(err)
      throw err
    }
  }, [refreshNotes])

  /**
   * Saves canvas data for a note
   * @param {number} noteId - Note ID
   * @param {Object|string} canvasData - Canvas data to save
   * @returns {Promise<number>} Number of updated records
   */
  const handleSaveCanvas = useCallback(async (noteId, canvasData) => {
    try {
      setError(null)
      const count = await saveNoteCanvas(noteId, canvasData)
      const note = await getNoteById(noteId)
      if (note) {
        await refreshNotes(note.notebookId)
      }
      return count
    } catch (err) {
      console.error('Error saving canvas:', err)
      setError(err)
      throw err
    }
  }, [refreshNotes])

  /**
   * Deletes a note
   * @param {number} id - Note ID
   * @param {number} [notebookId] - Optional notebook ID to refresh notes list
   * @returns {Promise<void>}
   */
  const handleDeleteNote = useCallback(async (id, notebookId) => {
    try {
      setError(null)
      await deleteNote(id)
      if (notebookId) {
        await refreshNotes(notebookId)
      }
      await refreshStats()
    } catch (err) {
      console.error('Error deleting note:', err)
      setError(err)
      throw err
    }
  }, [refreshNotes, refreshStats])

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Clears all database data
   * @returns {Promise<void>}
   */
  const handleClearDatabase = useCallback(async () => {
    try {
      setError(null)
      await clearAllData()
      await refreshNotebooks()
      await refreshStats()
      setNotes([])
    } catch (err) {
      console.error('Error clearing database:', err)
      setError(err)
      throw err
    }
  }, [refreshNotebooks, refreshStats])

  return {
    // State
    notebooks,
    notes,
    loading,
    error,
    stats,

    // Refresh functions
    refreshNotebooks,
    refreshNotes,
    refreshStats,

    // Notebook operations
    createNotebook: handleCreateNotebook,
    getNotebook: handleGetNotebook,
    updateNotebook: handleUpdateNotebook,
    deleteNotebook: handleDeleteNotebook,

    // Note operations
    createNote: handleCreateNote,
    getNote: handleGetNote,
    updateNote: handleUpdateNote,
    saveCanvas: handleSaveCanvas,
    deleteNote: handleDeleteNote,

    // Utility operations
    clearDatabase: handleClearDatabase,

    // Direct access to sync operations (if needed)
    addPendingSync,
    getPendingSync,
    clearPendingSync
  }
}

export default useIndexedDB
