import Dexie from 'dexie'

/**
 * IntelliNote Database Class
 * Manages all IndexedDB operations using Dexie.js
 */
class IntelliNoteDatabase extends Dexie {
  constructor() {
    super('IntelliNoteDB')
    
    // Define database schema
    this.version(1).stores({
      notebooks: '++id, name, color, createdAt, updatedAt',
      notes: '++id, notebookId, title, canvasData, createdAt, updatedAt, synced',
      pendingSync: '++id, action, data, timestamp'
    })

    // Type definitions for tables
    this.notebooks = this.table('notebooks')
    this.notes = this.table('notes')
    this.pendingSync = this.table('pendingSync')
  }
}

// Create database instance
const db = new IntelliNoteDatabase()

// ==================== NOTEBOOK OPERATIONS ====================

/**
 * Creates a new notebook
 * @param {string} name - The name of the notebook
 * @param {string} [color='#6366f1'] - The color theme for the notebook
 * @returns {Promise<number>} The ID of the created notebook
 * @throws {Error} If creation fails
 */
export const createNotebook = async (name, color = '#6366f1') => {
  try {
    if (!name || name.trim() === '') {
      throw new Error('Notebook name is required')
    }

    const now = new Date().toISOString()
    const id = await db.notebooks.add({
      name: name.trim(),
      color,
      createdAt: now,
      updatedAt: now
    })

    console.log(`✅ Notebook created with ID: ${id}`)
    return id
  } catch (error) {
    console.error('❌ Error creating notebook:', error)
    throw new Error(`Failed to create notebook: ${error.message}`)
  }
}

/**
 * Retrieves all notebooks
 * @returns {Promise<Array>} Array of all notebooks
 * @throws {Error} If retrieval fails
 */
export const getNotebooks = async () => {
  try {
    const notebooks = await db.notebooks.toArray()
    return notebooks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  } catch (error) {
    console.error('❌ Error fetching notebooks:', error)
    throw new Error(`Failed to fetch notebooks: ${error.message}`)
  }
}

/**
 * Retrieves a specific notebook by ID
 * @param {number} id - The notebook ID
 * @returns {Promise<Object|undefined>} The notebook object or undefined if not found
 * @throws {Error} If retrieval fails
 */
export const getNotebookById = async (id) => {
  try {
    if (!id) {
      throw new Error('Notebook ID is required')
    }

    const notebook = await db.notebooks.get(Number(id))
    return notebook
  } catch (error) {
    console.error(`❌ Error fetching notebook ${id}:`, error)
    throw new Error(`Failed to fetch notebook: ${error.message}`)
  }
}

/**
 * Updates a notebook's properties
 * @param {number} id - The notebook ID
 * @param {Object} updates - Object containing properties to update
 * @returns {Promise<number>} Number of updated records (should be 1)
 * @throws {Error} If update fails
 */
export const updateNotebook = async (id, updates) => {
  try {
    if (!id) {
      throw new Error('Notebook ID is required')
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    const count = await db.notebooks.update(Number(id), updatedData)
    
    if (count === 0) {
      throw new Error(`Notebook with ID ${id} not found`)
    }

    console.log(`✅ Notebook ${id} updated`)
    return count
  } catch (error) {
    console.error(`❌ Error updating notebook ${id}:`, error)
    throw new Error(`Failed to update notebook: ${error.message}`)
  }
}

/**
 * Deletes a notebook and all its associated notes
 * @param {number} id - The notebook ID
 * @returns {Promise<void>}
 * @throws {Error} If deletion fails
 */
export const deleteNotebook = async (id) => {
  try {
    if (!id) {
      throw new Error('Notebook ID is required')
    }

    // Delete all notes associated with this notebook
    await db.notes.where('notebookId').equals(Number(id)).delete()
    
    // Delete the notebook
    await db.notebooks.delete(Number(id))
    
    console.log(`✅ Notebook ${id} and its notes deleted`)
  } catch (error) {
    console.error(`❌ Error deleting notebook ${id}:`, error)
    throw new Error(`Failed to delete notebook: ${error.message}`)
  }
}

// ==================== NOTE OPERATIONS ====================

/**
 * Creates a new note in a notebook
 * @param {number} notebookId - The parent notebook ID
 * @param {string} [title='Untitled Note'] - The note title
 * @returns {Promise<number>} The ID of the created note
 * @throws {Error} If creation fails
 */
export const createNote = async (notebookId, title = 'Untitled Note') => {
  try {
    if (!notebookId) {
      throw new Error('Notebook ID is required')
    }

    // Verify notebook exists
    const notebook = await db.notebooks.get(Number(notebookId))
    if (!notebook) {
      throw new Error(`Notebook with ID ${notebookId} not found`)
    }

    const now = new Date().toISOString()
    const id = await db.notes.add({
      notebookId: Number(notebookId),
      title: title.trim(),
      canvasData: null,
      createdAt: now,
      updatedAt: now,
      synced: false
    })

    // Update notebook's updatedAt timestamp
    await updateNotebook(notebookId, {})

    console.log(`✅ Note created with ID: ${id}`)
    return id
  } catch (error) {
    console.error('❌ Error creating note:', error)
    throw new Error(`Failed to create note: ${error.message}`)
  }
}

/**
 * Retrieves all notes in a specific notebook
 * @param {number} notebookId - The notebook ID
 * @returns {Promise<Array>} Array of notes in the notebook
 * @throws {Error} If retrieval fails
 */
export const getNotesByNotebook = async (notebookId) => {
  try {
    if (!notebookId) {
      throw new Error('Notebook ID is required')
    }

    const notes = await db.notes
      .where('notebookId')
      .equals(Number(notebookId))
      .toArray()
    
    return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  } catch (error) {
    console.error(`❌ Error fetching notes for notebook ${notebookId}:`, error)
    throw new Error(`Failed to fetch notes: ${error.message}`)
  }
}

/**
 * Retrieves a specific note by ID
 * @param {number} id - The note ID
 * @returns {Promise<Object|undefined>} The note object or undefined if not found
 * @throws {Error} If retrieval fails
 */
export const getNoteById = async (id) => {
  try {
    if (!id) {
      throw new Error('Note ID is required')
    }

    const note = await db.notes.get(Number(id))
    return note
  } catch (error) {
    console.error(`❌ Error fetching note ${id}:`, error)
    throw new Error(`Failed to fetch note: ${error.message}`)
  }
}

/**
 * Saves canvas data to a note
 * @param {number} noteId - The note ID
 * @param {Object|string} canvasData - The canvas data to save
 * @returns {Promise<number>} Number of updated records (should be 1)
 * @throws {Error} If save fails
 */
export const saveNoteCanvas = async (noteId, canvasData) => {
  try {
    if (!noteId) {
      throw new Error('Note ID is required')
    }

    const now = new Date().toISOString()
    const count = await db.notes.update(Number(noteId), {
      canvasData,
      updatedAt: now,
      synced: false
    })

    if (count === 0) {
      throw new Error(`Note with ID ${noteId} not found`)
    }

    // Update parent notebook's timestamp
    const note = await db.notes.get(Number(noteId))
    if (note) {
      await updateNotebook(note.notebookId, {})
    }

    console.log(`✅ Canvas data saved for note ${noteId}`)
    return count
  } catch (error) {
    console.error(`❌ Error saving canvas data for note ${noteId}:`, error)
    throw new Error(`Failed to save canvas data: ${error.message}`)
  }
}

/**
 * Updates a note's properties
 * @param {number} id - The note ID
 * @param {Object} updates - Object containing properties to update
 * @returns {Promise<number>} Number of updated records (should be 1)
 * @throws {Error} If update fails
 */
export const updateNote = async (id, updates) => {
  try {
    if (!id) {
      throw new Error('Note ID is required')
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      synced: false
    }

    const count = await db.notes.update(Number(id), updatedData)
    
    if (count === 0) {
      throw new Error(`Note with ID ${id} not found`)
    }

    // Update parent notebook's timestamp
    const note = await db.notes.get(Number(id))
    if (note) {
      await updateNotebook(note.notebookId, {})
    }

    console.log(`✅ Note ${id} updated`)
    return count
  } catch (error) {
    console.error(`❌ Error updating note ${id}:`, error)
    throw new Error(`Failed to update note: ${error.message}`)
  }
}

/**
 * Deletes a note
 * @param {number} id - The note ID
 * @returns {Promise<void>}
 * @throws {Error} If deletion fails
 */
export const deleteNote = async (id) => {
  try {
    if (!id) {
      throw new Error('Note ID is required')
    }

    // Get note before deletion to update parent notebook
    const note = await db.notes.get(Number(id))
    
    await db.notes.delete(Number(id))
    
    // Update parent notebook's timestamp if note existed
    if (note) {
      await updateNotebook(note.notebookId, {})
    }

    console.log(`✅ Note ${id} deleted`)
  } catch (error) {
    console.error(`❌ Error deleting note ${id}:`, error)
    throw new Error(`Failed to delete note: ${error.message}`)
  }
}

// ==================== PENDING SYNC OPERATIONS ====================

/**
 * Adds an action to the pending sync queue
 * @param {string} action - The action type (create, update, delete)
 * @param {Object} data - The data associated with the action
 * @returns {Promise<number>} The ID of the pending sync record
 * @throws {Error} If addition fails
 */
export const addPendingSync = async (action, data) => {
  try {
    const id = await db.pendingSync.add({
      action,
      data,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Pending sync added with ID: ${id}`)
    return id
  } catch (error) {
    console.error('❌ Error adding pending sync:', error)
    throw new Error(`Failed to add pending sync: ${error.message}`)
  }
}

/**
 * Retrieves all pending sync actions
 * @returns {Promise<Array>} Array of pending sync actions
 * @throws {Error} If retrieval fails
 */
export const getPendingSync = async () => {
  try {
    return await db.pendingSync.toArray()
  } catch (error) {
    console.error('❌ Error fetching pending sync:', error)
    throw new Error(`Failed to fetch pending sync: ${error.message}`)
  }
}

/**
 * Clears all pending sync actions
 * @returns {Promise<void>}
 * @throws {Error} If clear fails
 */
export const clearPendingSync = async () => {
  try {
    await db.pendingSync.clear()
    console.log('✅ Pending sync cleared')
  } catch (error) {
    console.error('❌ Error clearing pending sync:', error)
    throw new Error(`Failed to clear pending sync: ${error.message}`)
  }
}

// ==================== UTILITY OPERATIONS ====================

/**
 * Clears all data from the database (use with caution!)
 * @returns {Promise<void>}
 * @throws {Error} If clear fails
 */
export const clearAllData = async () => {
  try {
    await db.notebooks.clear()
    await db.notes.clear()
    await db.pendingSync.clear()
    console.log('✅ All database data cleared')
  } catch (error) {
    console.error('❌ Error clearing database:', error)
    throw new Error(`Failed to clear database: ${error.message}`)
  }
}

/**
 * Gets database statistics
 * @returns {Promise<Object>} Object containing counts of notebooks, notes, and pending syncs
 * @throws {Error} If retrieval fails
 */
export const getDatabaseStats = async () => {
  try {
    const [notebooksCount, notesCount, pendingSyncCount] = await Promise.all([
      db.notebooks.count(),
      db.notes.count(),
      db.pendingSync.count()
    ])

    return {
      notebooks: notebooksCount,
      notes: notesCount,
      pendingSync: pendingSyncCount
    }
  } catch (error) {
    console.error('❌ Error getting database stats:', error)
    throw new Error(`Failed to get database stats: ${error.message}`)
  }
}

// Export database instance for advanced usage
export { db }

export default db
