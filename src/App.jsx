import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/notebook/:notebookId/note/:noteId" element={<EditorPage />} />
    </Routes>
  );
}

export default App;
