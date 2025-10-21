import Dexie from 'dexie';

// Initialize Dexie database
export const db = new Dexie('IntelliNoteDB');

// Define database schema
db.version(1).stores({
  notebooks: '++id, name, createdAt, updatedAt',
  notes: '++id, notebookId, title, content, createdAt, updatedAt',
});

// Notebook CRUD operations
export async function createNotebook(name) {
  const now = new Date().toISOString();
  const id = await db.notebooks.add({
    name,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function getNotebooks() {
  return await db.notebooks.orderBy('updatedAt').reverse().toArray();
}

export async function getNotebook(id) {
  return await db.notebooks.get(id);
}

export async function updateNotebook(id, updates) {
  const now = new Date().toISOString();
  await db.notebooks.update(id, {
    ...updates,
    updatedAt: now,
  });
}

export async function deleteNotebook(id) {
  // Delete all notes in the notebook first
  await db.notes.where('notebookId').equals(id).delete();
  // Then delete the notebook
  await db.notebooks.delete(id);
}

// Note CRUD operations
export async function createNote(notebookId, title = 'Untitled Note', content = '') {
  const now = new Date().toISOString();
  const id = await db.notes.add({
    notebookId,
    title,
    content,
    createdAt: now,
    updatedAt: now,
  });
  
  // Update the notebook's updatedAt timestamp
  await updateNotebook(notebookId, {});
  
  return id;
}

export async function getNotesByNotebook(notebookId) {
  return await db.notes
    .where('notebookId')
    .equals(notebookId)
    .sortBy('updatedAt');
}

export async function getNote(id) {
  return await db.notes.get(id);
}

export async function updateNote(id, updates) {
  const now = new Date().toISOString();
  const note = await db.notes.get(id);
  
  await db.notes.update(id, {
    ...updates,
    updatedAt: now,
  });
  
  // Update the notebook's updatedAt timestamp
  if (note) {
    await updateNotebook(note.notebookId, {});
  }
}

export async function deleteNote(id) {
  const note = await db.notes.get(id);
  await db.notes.delete(id);
  
  // Update the notebook's updatedAt timestamp
  if (note) {
    await updateNotebook(note.notebookId, {});
  }
}
