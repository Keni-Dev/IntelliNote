import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">
            IntelliNote
          </h1>
          <p className="text-text-secondary text-lg">
            Your intelligent note-taking companion
          </p>
        </div>

        {/* Main Content Card */}
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-semibold text-text-primary">
              Home - Notebook List
            </h2>
            <button className="glass-button">
              + New Notebook
            </button>
          </div>

          {/* Placeholder Content */}
          <div className="space-y-4">
            <div className="glass-panel p-6 hover:scale-[1.02] transition-transform cursor-pointer">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Sample Notebook 1
              </h3>
              <p className="text-text-muted">
                3 notes • Last edited 2 hours ago
              </p>
            </div>

            <div className="glass-panel p-6 hover:scale-[1.02] transition-transform cursor-pointer">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Sample Notebook 2
              </h3>
              <p className="text-text-muted">
                7 notes • Last edited yesterday
              </p>
            </div>

            <div className="glass-panel p-6 hover:scale-[1.02] transition-transform cursor-pointer">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Sample Notebook 3
              </h3>
              <p className="text-text-muted">
                1 note • Last edited 3 days ago
              </p>
            </div>
          </div>
        </div>

        {/* Demo Navigation Links */}
        <div className="mt-8 glass-card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Demo Navigation:
          </h3>
          <div className="flex gap-4">
            <Link to="/notebook/1" className="glass-button">
              View Notebook
            </Link>
            <Link to="/editor/1/1" className="glass-button">
              Open Editor
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
