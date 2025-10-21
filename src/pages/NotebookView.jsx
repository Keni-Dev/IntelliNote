import { useParams, Link } from 'react-router-dom'

function NotebookView() {
  const { notebookId } = useParams()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2 text-text-muted">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-text-primary">Notebook {notebookId}</span>
        </div>

        {/* Header */}
        <div className="glass-card p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">
                Notebook View
              </h1>
              <p className="text-text-secondary">
                Viewing notebook: <span className="text-primary font-semibold">Notebook {notebookId}</span>
              </p>
            </div>
            <button className="glass-button">
              + New Note
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          <Link to={`/editor/${notebookId}/1`} className="block">
            <div className="glass-card p-6 hover:scale-[1.01] transition-transform">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-text-primary mb-2">
                    Sample Note 1
                  </h3>
                  <p className="text-text-muted mb-3">
                    This is a preview of the note content. Click to open in the canvas editor...
                  </p>
                  <div className="flex gap-3 text-sm text-text-muted">
                    <span>📅 Created: Oct 21, 2025</span>
                    <span>•</span>
                    <span>✏️ Last edited: 1 hour ago</span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                    Canvas
                  </span>
                </div>
              </div>
            </div>
          </Link>

          <Link to={`/editor/${notebookId}/2`} className="block">
            <div className="glass-card p-6 hover:scale-[1.01] transition-transform">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-text-primary mb-2">
                    Sample Note 2
                  </h3>
                  <p className="text-text-muted mb-3">
                    Another note with some interesting content and diagrams...
                  </p>
                  <div className="flex gap-3 text-sm text-text-muted">
                    <span>📅 Created: Oct 20, 2025</span>
                    <span>•</span>
                    <span>✏️ Last edited: 3 hours ago</span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className="px-3 py-1 bg-success/20 text-success rounded-full text-sm">
                    Canvas
                  </span>
                </div>
              </div>
            </div>
          </Link>

          <Link to={`/editor/${notebookId}/3`} className="block">
            <div className="glass-card p-6 hover:scale-[1.01] transition-transform">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-text-primary mb-2">
                    Sample Note 3
                  </h3>
                  <p className="text-text-muted mb-3">
                    Math equations and handwritten notes stored here...
                  </p>
                  <div className="flex gap-3 text-sm text-text-muted">
                    <span>📅 Created: Oct 19, 2025</span>
                    <span>•</span>
                    <span>✏️ Last edited: Yesterday</span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className="px-3 py-1 bg-warning/20 text-warning rounded-full text-sm">
                    Canvas
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link to="/" className="glass-button inline-block">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotebookView
