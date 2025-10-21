import { useParams, Link } from 'react-router-dom'

function Editor() {
  const { notebookId, noteId } = useParams()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <div className="glass-panel border-b border-white/5">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-3 text-text-muted">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link 
              to={`/notebook/${notebookId}`} 
              className="hover:text-primary transition-colors"
            >
              Notebook {notebookId}
            </Link>
            <span>/</span>
            <span className="text-text-primary font-semibold">Note {noteId}</span>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            <button className="glass-button text-sm">
              Save
            </button>
            <button className="glass-button text-sm">
              Export
            </button>
            <Link to={`/notebook/${notebookId}`} className="glass-button text-sm">
              Close
            </Link>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto h-full">
          <div className="glass-card p-8 h-full flex flex-col">
            {/* Editor Header */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gradient mb-2">
                Editor
              </h1>
              <p className="text-text-secondary">
                Canvas Editor for Note {noteId} in Notebook {notebookId}
              </p>
            </div>

            {/* Toolbar */}
            <div className="glass-panel p-4 mb-6 flex items-center gap-3">
              <button className="glass-button text-sm">
                ✏️ Pen
              </button>
              <button className="glass-button text-sm">
                📐 Shapes
              </button>
              <button className="glass-button text-sm">
                🎨 Colors
              </button>
              <button className="glass-button text-sm">
                📝 Text
              </button>
              <button className="glass-button text-sm">
                📷 Image
              </button>
              <button className="glass-button text-sm">
                🧮 Math
              </button>
              <div className="flex-1"></div>
              <button className="glass-button text-sm">
                ↶ Undo
              </button>
              <button className="glass-button text-sm">
                ↷ Redo
              </button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 bg-bg-tertiary/30 backdrop-blur-sm rounded-lg border border-white/5 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h2 className="text-2xl font-semibold text-text-primary mb-2">
                  Canvas Editor
                </h2>
                <p className="text-text-muted max-w-md">
                  This is where the infinite canvas will be rendered. 
                  Draw, write, add images, and create mind maps here.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  <div className="glass-panel px-4 py-2">
                    <span className="text-text-muted text-sm">Zoom: </span>
                    <span className="text-text-primary font-semibold">100%</span>
                  </div>
                  <div className="glass-panel px-4 py-2">
                    <span className="text-text-muted text-sm">Objects: </span>
                    <span className="text-text-primary font-semibold">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Editor
