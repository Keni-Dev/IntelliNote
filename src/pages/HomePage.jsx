import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/common/GlassCard';
import { getNotebooks, createNotebook, createNote } from '../db';

function HomePage() {
  const [notebooks, setNotebooks] = useState([]);
  const navigate = useNavigate();

  // Fetch notebooks from Dexie database when component mounts
  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    try {
      const fetchedNotebooks = await getNotebooks();
      setNotebooks(fetchedNotebooks);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    }
  };

  const handleNewNotebook = async () => {
    const notebookName = window.prompt('Enter notebook name:');
    
    if (notebookName && notebookName.trim()) {
      try {
        await createNotebook(notebookName.trim());
        await fetchNotebooks(); // Refresh the list
      } catch (error) {
        console.error('Error creating notebook:', error);
      }
    }
  };

  const handleNotebookClick = async (notebookId) => {
    try {
      // Create a default note for the notebook
      const noteId = await createNote(notebookId, 'Untitled Note', '');
      
      // Navigate to the editor page with the notebookId and noteId
      navigate(`/notebook/${notebookId}/note/${noteId}`);
    } catch (error) {
      console.error('Error opening notebook:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-900 via-bg-800 to-bg-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <h1 className="text-5xl font-bold text-bg-50">
            IntelliNote
          </h1>
          <button
            onClick={handleNewNotebook}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            New Notebook
          </button>
        </header>

        {/* Notebooks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {notebooks.map((notebook) => (
            <GlassCard
              key={notebook.id}
              onClick={() => handleNotebookClick(notebook.id)}
              className="p-6 hover:scale-105"
            >
              <div className="flex flex-col h-full">
                <h3 className="text-xl font-semibold text-bg-50 mb-2">
                  {notebook.name}
                </h3>
                <p className="text-bg-300 text-sm mt-auto">
                  Last updated: {new Date(notebook.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Empty state message */}
        {notebooks.length === 0 && (
          <div className="text-center mt-20">
            <p className="text-bg-300 text-lg">
              No notebooks yet. Create your first notebook to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
