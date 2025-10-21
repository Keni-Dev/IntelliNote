import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import NotebookView from './pages/NotebookView'
import Editor from './pages/Editor'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notebook/:notebookId" element={<NotebookView />} />
          <Route path="/editor/:notebookId/:noteId" element={<Editor />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
