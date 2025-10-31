import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas, Navbar } from '../components/editor';
import { useIndexedDB } from '../hooks/useIndexedDB';

function Editor() {
  const { notebookId, noteId } = useParams();
  const { getNote, updateNote } = useIndexedDB();
  
  const [note, setNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  
  const lastSavedCanvasDataRef = useRef(null);
  const latestCanvasDataRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const canvasRef = useRef(null); // Reference to canvas methods
  const saveInFlightRef = useRef(false);
  const pendingFlushRef = useRef(false);
  const isMountedRef = useRef(true);
  const drawingInProgressRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch note data on mount
  useEffect(() => {
    const fetchNote = async () => {
      try {
        setIsLoading(true);
        const fetchedNote = await getNote(Number(noteId));
        
        if (fetchedNote) {
          setNote(fetchedNote);
          setNoteTitle(fetchedNote.title);
          const initialCanvasData = fetchedNote.canvasData || null;
          lastSavedCanvasDataRef.current = initialCanvasData;
          latestCanvasDataRef.current = initialCanvasData;
          
          // Extract zoom level if available
          if (fetchedNote.canvasData) {
            try {
              const parsedData = JSON.parse(fetchedNote.canvasData);
              if (parsedData.zoom) {
                setZoom(parsedData.zoom);
              }
            } catch (error) {
              console.error('Error parsing canvas data for zoom:', error);
            }
          }
        } else {
          console.error('Note not found');
        }
      } catch (error) {
        console.error('Error fetching note:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (noteId) {
      fetchNote();
    }
  }, [noteId, getNote]);

  const flushPendingSaves = useCallback(async ({ immediate = false, suppressStatus = false } = {}) => {
    if (!note) {
      return;
    }

    const latestData = latestCanvasDataRef.current;
    if (latestData === null || latestData === undefined) {
      return;
    }

    if (!immediate && drawingInProgressRef.current) {
      pendingFlushRef.current = true;
      return;
    }

    if (saveInFlightRef.current) {
      pendingFlushRef.current = true;
      return;
    }

    if (latestData === lastSavedCanvasDataRef.current) {
      return;
    }

    const dataToSave = latestData;
    saveInFlightRef.current = true;
    pendingFlushRef.current = false;

    if (!suppressStatus && isMountedRef.current) {
      setSaveStatus('saving');
    }

    try {
      await updateNote(note.id, {
        ...note,
        canvasData: dataToSave,
        updatedAt: new Date(),
      });

      lastSavedCanvasDataRef.current = dataToSave;

      if (!suppressStatus && isMountedRef.current) {
        setNote((prev) => (prev ? { ...prev, canvasData: dataToSave, updatedAt: new Date() } : prev));

        if (latestCanvasDataRef.current === dataToSave) {
          setSaveStatus('saved');

          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setSaveStatus('saved');
            }
          }, 2000);
        } else {
          setSaveStatus('unsaved');
        }
      }
    } catch (error) {
      console.error('Error saving canvas:', error);
      if (!suppressStatus && isMountedRef.current) {
        setSaveStatus('error');
      }
    } finally {
      saveInFlightRef.current = false;

      if (latestCanvasDataRef.current !== lastSavedCanvasDataRef.current) {
        if (immediate) {
          setTimeout(() => {
            flushPendingSaves({ immediate: true, suppressStatus }).catch(() => {});
          }, 0);
        } else if (pendingFlushRef.current) {
          pendingFlushRef.current = false;
          setTimeout(() => {
            flushPendingSaves({ immediate: true, suppressStatus }).catch(() => {});
          }, 0);
        }
      }
    }
  }, [note, updateNote]);

  const handleDrawingStateChange = useCallback((isDrawing) => {
    drawingInProgressRef.current = isDrawing;

    if (isDrawing) {
      if (isMountedRef.current && saveStatus !== 'saving') {
        setSaveStatus('unsaved');
      }
    } else {
      if (pendingFlushRef.current) {
        pendingFlushRef.current = false;
        flushPendingSaves({ immediate: true }).catch(() => {});
      }
    }
  }, [flushPendingSaves, saveStatus]);

  // Handle canvas changes
  const handleCanvasChange = useCallback((newCanvasData) => {
    latestCanvasDataRef.current = newCanvasData;
    
    // Extract and update zoom level
    try {
      const parsedData = JSON.parse(newCanvasData);
      if (parsedData.zoom !== undefined) {
        setZoom(parsedData.zoom);
      }
    } catch {
      // Ignore parse errors
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (saveInFlightRef.current) {
      pendingFlushRef.current = true;
      if (isMountedRef.current) {
        setSaveStatus('saving');
      }
    } else if (isMountedRef.current) {
      setSaveStatus('unsaved');
      
      // Auto-save after 1 second of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        flushPendingSaves({ immediate: true }).catch(() => {});
      }, 1000);
    }
  }, [flushPendingSaves]);

  // Handle zoom change from Navbar
  const handleZoomChange = useCallback((newZoom) => {
    if (canvasRef.current && canvasRef.current.setCanvasZoom) {
      canvasRef.current.setCanvasZoom(newZoom);
    }
  }, []);

  // Zoom control functions for Navbar
  const handleZoomIn = useCallback(() => {
    if (canvasRef.current && canvasRef.current.zoomIn) {
      canvasRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (canvasRef.current && canvasRef.current.zoomOut) {
      canvasRef.current.zoomOut();
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (canvasRef.current && canvasRef.current.resetZoom) {
      canvasRef.current.resetZoom();
    }
  }, []);

  const handleFitToWindow = useCallback(() => {
    if (canvasRef.current && canvasRef.current.fitToWindow) {
      canvasRef.current.fitToWindow();
    }
  }, []);

  // Handle title change
  const handleTitleChange = async (newTitle) => {
    if (!note || newTitle === noteTitle) return;

    try {
      setSaveStatus('saving');
      setNoteTitle(newTitle);

      await updateNote(note.id, {
        ...note,
        title: newTitle,
        updatedAt: new Date(),
      });

      setNote({ ...note, title: newTitle });
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error updating title:', error);
      setSaveStatus('error');
      // Revert title on error
      setNoteTitle(note.title);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      flushPendingSaves({ immediate: true, suppressStatus: true }).catch(() => {});

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // Re-run cleanup when switching between notes so previous note's changes flush before loading the next one.
  }, [flushPendingSaves, noteId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSaves({ immediate: true, suppressStatus: true }).catch(() => {});
      }
    };

    const handlePageHide = () => {
      flushPendingSaves({ immediate: true, suppressStatus: true }).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [flushPendingSaves]);

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium text-lg">Loading note...</p>
        </div>
      </div>
    );
  }

  // Show error if note not found
  if (!note) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Note not found</h1>
          <p className="text-gray-600">The note you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Navigation Bar */}
      <Navbar
        notebookId={notebookId}
        noteTitle={noteTitle}
        saveStatus={saveStatus}
        onTitleChange={handleTitleChange}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitToWindow={handleFitToWindow}
      />

      {/* Canvas Area - Full screen below navbar */}
      <div className="flex-1 mt-16">
        <Canvas
          ref={canvasRef}
          noteId={noteId}
          noteType={note.noteType || 'auto'}
          initialCanvasData={note.canvasData}
          onCanvasChange={handleCanvasChange}
          onDrawingStateChange={handleDrawingStateChange}
          onViewChange={(z) => setZoom(z)}
        />
      </div>
    </div>
  );
}

export default Editor;
