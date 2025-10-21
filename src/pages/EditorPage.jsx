import { useParams } from 'react-router-dom';

function EditorPage() {
  const { notebookId, noteId } = useParams();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-bg-50 mb-4">
          Note Editor
        </h1>
        <div className="text-bg-200">
          <p>Notebook ID: {notebookId}</p>
          <p>Note ID: {noteId}</p>
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
