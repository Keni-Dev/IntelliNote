# 🚀 IntelliNote - Complete Development Guide

## Summary

**Project:** IntelliNote - Intelligent Note-Taking App for Math & Physics Students  
**Platform:** Progressive Web App (PWA) - Windows Desktop + iOS  
**Core Innovation:** Hybrid math OCR with automatic equation solving  
**Target Users:** Students (Math & Physics focus)

---

## 📋 Table of Contents

1. [Technical Architecture](#technical-architecture)
2. [Tech Stack](#tech-stack)
3. [Design System](#design-system)
4. [Feature Specifications](#feature-specifications)
5. [Development Roadmap](#development-roadmap)
6. [Implementation Details](#implementation-details)
7. [Data Models](#data-models)
8. [Sync Strategy](#sync-strategy)
9. [Testing & Deployment](#testing--deployment)

---

## 1. Technical Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────┐
│                   IntelliNote PWA                        │
├─────────────────────────────────────────────────────────┤
│  React Frontend (Single Page Application)               │
│  ├── Notebook Manager (Menu/Selection)                  │
│  ├── Canvas Editor (Infinite/Large workspace)           │
│  ├── Math OCR Engine (Hybrid: Hand + Type)              │
│  └── Equation Solver (Math.js + Custom Parser)          │
├─────────────────────────────────────────────────────────┤
│  Local Storage Layer (IndexedDB)                        │
│  └── Offline-first data persistence                     │
├─────────────────────────────────────────────────────────┤
│  Sync Engine (Background Sync API)                      │
│  └── Cloud sync when online (Firebase/Supabase)         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### Frontend Framework
- **React 18+** with Hooks
- **React Router** for navigation
- **Vite** for build tooling (faster than Create React App)

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **Glassmorphism Effects** - Custom CSS with backdrop-filter

### Canvas & Drawing
- **Fabric.js** - Powerful canvas library for drawing
- **Pen tablet support** via Pointer Events API
- **Pan/Zoom controls** for infinite canvas

### Math & OCR
- **Math.js** - Equation solving (offline)
- **MyScript Math Web Component** - Free tier for simpler handwriting recognition
- **KaTeX** or **MathJax** - Math equation rendering
- **Custom parser** - For formula detection and variable extraction

### Data & Storage
- **IndexedDB** (via Dexie.js) - Local database
- **Firebase** (Free tier) or **Supabase** (Free tier) - Cloud sync & auth
- **Service Workers** - Offline functionality

### PWA Features
- **Workbox** - Service worker generation
- **Web App Manifest** - Install on home screen
- **Cache API** - Offline assets

### Utilities
- **uuid** - Unique ID generation
- **date-fns** - Date formatting
- **lodash** - Utility functions

---

## 3. Design System

### Color Scheme (Modern Glassmorphism)
```css
/* Primary Palette */
--primary: #6366f1     /* Indigo - Main accent */
--primary-light: #818cf8
--primary-dark: #4f46e5

/* Background (Dark mode friendly) */
--bg-primary: #0f172a    /* Slate 900 */
--bg-secondary: #1e293b  /* Slate 800 */
--bg-tertiary: #334155   /* Slate 700 */

/* Glass effect backgrounds */
--glass-bg: rgba(255, 255, 255, 0.1)
--glass-border: rgba(255, 255, 255, 0.2)

/* Text */
--text-primary: #f1f5f9   /* Slate 100 */
--text-secondary: #cbd5e1 /* Slate 300 */
--text-muted: #94a3b8     /* Slate 400 */

/* Accents */
--success: #10b981  /* Green */
--warning: #f59e0b  /* Amber */
--error: #ef4444    /* Red */
```

### Typography
- **Font Family:** Roboto (Google Fonts)
- **Headings:** Roboto 600 (Semi-bold)
- **Body:** Roboto 400 (Regular)
- **Code/Math:** Roboto Mono

### Glassmorphism Components
```css
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
```

---

## 4. Feature Specifications

### 4.1 Core Features

#### **A. Notebook Management**
- Create, rename, delete notebooks
- List view with preview thumbnails
- Search notebooks
- Color-coded notebooks

#### **B. Note Editor - Infinite Canvas**
- **Drawing Tools:**
  - Pen (multiple sizes & colors)
  - Eraser
  - Text tool (keyboard input)
  - Shape tools (line, rectangle, circle)
  - Selection/move tool
  
- **Canvas Controls:**
  - Pan (drag to move)
  - Zoom (pinch or mouse wheel)
  - Grid background (optional)
  - Unlimited canvas space (virtual viewport)

- **Keyboard Shortcuts:**
  - `Ctrl+Z` / `Cmd+Z` - Undo
  - `Ctrl+Y` / `Cmd+Y` - Redo
  - `Ctrl+S` / `Cmd+S` - Save
  - `Ctrl+N` / `Cmd+N` - New note
  - `Space + Drag` - Pan canvas

#### **C. Math OCR & Solver (Hybrid)**

**Input Methods:**
1. **Handwriting:** Draw equations with pen/stylus
2. **Typed:** Type equations using keyboard

**Recognition Flow:**
```
User writes "=" → System detects → Scans nearby strokes/text → 
Identifies equation → Extracts variables → Solves → Displays result
```

**Supported Operations:**
- Basic arithmetic (+, -, ×, ÷)
- Exponents (x², x³, xⁿ)
- Roots (√, ∛)
- Trigonometry (sin, cos, tan)
- Logarithms (log, ln)
- Variables and formulas
- Physics equations (v = d/t, F = ma, etc.)

**Example Use Cases:**
```
User writes: F = ma
User writes: m = 5
User writes: a = 10
User writes: F = ?

System recognizes formula, substitutes values, solves: F = 50
```

#### **D. Data Persistence & Sync**
- **Offline-first:** All data stored locally in IndexedDB
- **Auto-save:** Save after each stroke (debounced)
- **Cloud sync:** Background sync when online
- **Conflict resolution:** Last-write-wins with timestamp

---

## 5. Development Roadmap

### **Phase 1: Foundation (Week 1-2)**
- [ ] Set up React + Vite project
- [ ] Configure Tailwind CSS with glassmorphism theme
- [ ] Set up routing (React Router)
- [ ] Create basic layout structure
- [ ] Implement IndexedDB with Dexie.js
- [ ] Design data models

### **Phase 2: Notebook Management (Week 3)**
- [ ] Notebook list view (glassmorphism cards)
- [ ] Create/Read/Update/Delete notebooks
- [ ] Note selection within notebooks
- [ ] Search functionality
- [ ] Local storage integration

### **Phase 3: Canvas Editor (Week 4-5)**
- [ ] Integrate Fabric.js canvas
- [ ] Implement drawing tools (pen, eraser)
- [ ] Add pan and zoom controls
- [ ] Infinite/large canvas viewport
- [ ] Pen tablet support (Pointer Events)
- [ ] Undo/Redo stack
- [ ] Keyboard shortcuts

### **Phase 4: Math OCR - Typed Input (Week 6)**
- [ ] Equation input component
- [ ] Math.js integration
- [ ] Basic equation parser
- [ ] Variable extraction
- [ ] Formula recognition
- [ ] Display solutions with KaTeX

### **Phase 5: Math OCR - Handwriting (Week 7-8)**
- [ ] Integrate MyScript or simple ML model
- [ ] Stroke-to-equation conversion
- [ ] "=" trigger detection
- [ ] Context scanning (find nearby formulas/values)
- [ ] Combine with typed input system

### **Phase 6: PWA Features (Week 9)**
- [ ] Service worker setup (Workbox)
- [ ] Web app manifest
- [ ] Install prompts
- [ ] Offline functionality
- [ ] Cache strategies

### **Phase 7: Cloud Sync (Week 10)**
- [ ] Firebase/Supabase setup
- [ ] Authentication (email/Google)
- [ ] Real-time sync engine
- [ ] Conflict resolution
- [ ] Background sync

### **Phase 8: Polish & Testing (Week 11-12)**
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Bug fixes
- [ ] User testing
- [ ] Documentation

---

## 6. Implementation Details

### 6.1 Project Setup

```bash
# Create Vite React project
npm create vite@latest intellinote -- --template react
cd intellinote
npm install

# Install dependencies
npm install react-router-dom
npm install -D tailwindcss postcss autoprefixer
npm install fabric
npm install mathjs
npm install katex
npm install dexie
npm install framer-motion
npm install uuid
npm install date-fns

# PWA
npm install -D vite-plugin-pwa workbox-window

# Firebase (for sync)
npm install firebase

# Initialize Tailwind
npx tailwindcss init -p
```

### 6.2 Project Structure

```
intellinote/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── notebook/
│   │   │   ├── NotebookList.jsx
│   │   │   ├── NotebookCard.jsx
│   │   │   └── NotebookModal.jsx
│   │   ├── editor/
│   │   │   ├── Canvas.jsx
│   │   │   ├── Toolbar.jsx
│   │   │   ├── DrawingControls.jsx
│   │   │   └── MathSolver.jsx
│   │   └── common/
│   │       ├── Button.jsx
│   │       └── Input.jsx
│   ├── hooks/
│   │   ├── useCanvas.js
│   │   ├── useIndexedDB.js
│   │   ├── useMathOCR.js
│   │   └── useSync.js
│   ├── lib/
│   │   ├── db.js (Dexie setup)
│   │   ├── mathParser.js
│   │   ├── ocrEngine.js
│   │   └── syncEngine.js
│   ├── pages/
│   │   ├── Home.jsx (Notebook selection)
│   │   ├── Editor.jsx (Note editor)
│   │   └── Settings.jsx
│   ├── styles/
│   │   └── globals.css
│   ├── utils/
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

### 6.3 Key Code Implementations

#### **Tailwind Config (Glassmorphism)**

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
        },
        bg: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
```

#### **IndexedDB Setup (Dexie.js)**

```javascript
// src/lib/db.js
import Dexie from 'dexie';

export const db = new Dexie('IntelliNoteDB');

db.version(1).stores({
  notebooks: '++id, name, createdAt, updatedAt, color',
  notes: '++id, notebookId, title, canvasData, createdAt, updatedAt, synced',
  pendingSync: '++id, action, data, timestamp'
});

// Helper functions
export const createNotebook = async (name, color = '#6366f1') => {
  return await db.notebooks.add({
    name,
    color,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

export const getNotebooks = async () => {
  return await db.notebooks.toArray();
};

export const createNote = async (notebookId, title = 'Untitled') => {
  return await db.notes.add({
    notebookId,
    title,
    canvasData: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
  });
};

export const saveNoteCanvas = async (noteId, canvasData) => {
  return await db.notes.update(noteId, {
    canvasData: JSON.stringify(canvasData),
    updatedAt: new Date(),
    synced: false,
  });
};

export const getNotesByNotebook = async (notebookId) => {
  return await db.notes.where('notebookId').equals(notebookId).toArray();
};
```

#### **Canvas Component (Fabric.js)**

```jsx
// src/components/editor/Canvas.jsx
import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { saveNoteCanvas } from '../../lib/db';
import { debounce } from 'lodash';

export default function Canvas({ noteId, initialData }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);

  useEffect(() => {
    // Initialize Fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      isDrawingMode: true,
      backgroundColor: '#ffffff',
    });

    canvas.freeDrawingBrush.width = brushSize;
    canvas.freeDrawingBrush.color = color;

    fabricCanvasRef.current = canvas;

    // Load existing canvas data
    if (initialData) {
      canvas.loadFromJSON(JSON.parse(initialData));
    }

    // Auto-save on changes (debounced)
    const handleCanvasChange = debounce(() => {
      const data = canvas.toJSON();
      saveNoteCanvas(noteId, data);
    }, 1000);

    canvas.on('object:modified', handleCanvasChange);
    canvas.on('object:added', handleCanvasChange);

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.dispose();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [noteId]);

  // Tool switching
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (tool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = color;
    } else if (tool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
      canvas.freeDrawingBrush.width = brushSize * 3;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [tool, color, brushSize]);

  const undo = () => {
    // Implement undo logic
    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
    }
  };

  const redo = () => {
    // Implement redo logic (requires history stack)
  };

  return (
    <div className="relative w-full h-screen">
      <canvas ref={canvasRef} />
      
      {/* Toolbar will be a separate component */}
      <Toolbar 
        tool={tool} 
        setTool={setTool}
        color={color}
        setColor={setColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
      />
    </div>
  );
}
```

#### **Math Parser & Solver**

```javascript
// src/lib/mathParser.js
import * as math from 'mathjs';

export class MathSolver {
  constructor() {
    this.variables = {};
    this.formulas = {};
  }

  // Detect if stroke contains "="
  containsEquals(text) {
    return text.includes('=');
  }

  // Extract equation parts
  parseEquation(text) {
    const [left, right] = text.split('=').map(s => s.trim());
    return { left, right };
  }

  // Store variable value
  storeVariable(name, value) {
    this.variables[name] = value;
  }

  // Store formula
  storeFormula(name, expression) {
    this.formulas[name] = expression;
  }

  // Solve equation
  solve(equation) {
    try {
      const { left, right } = this.parseEquation(equation);
      
      // If right side is "?", solve for left variable
      if (right === '?') {
        // Find formula that matches
        const formula = this.findMatchingFormula(left);
        if (formula) {
          const result = this.evaluateFormula(formula);
          return { success: true, result, variable: left };
        }
      }
      
      // Direct calculation
      if (right !== '?' && !isNaN(right)) {
        this.storeVariable(left, parseFloat(right));
        return { success: true, stored: true };
      }
      
      // Evaluate expression
      const scope = { ...this.variables };
      const result = math.evaluate(left, scope);
      return { success: true, result };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  findMatchingFormula(variableName) {
    // Logic to find formula where variableName is the subject
    return this.formulas[variableName];
  }

  evaluateFormula(formula) {
    const scope = { ...this.variables };
    return math.evaluate(formula, scope);
  }

  // Advanced: Solve for unknown variable
  solveFor(equation, variable) {
    try {
      const node = math.parse(equation);
      const scope = { ...this.variables };
      const solution = math.simplify(node, scope);
      return { success: true, result: solution.toString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Example usage:
// const solver = new MathSolver();
// solver.storeFormula('F', 'ma');
// solver.storeVariable('m', 5);
// solver.storeVariable('a', 10);
// solver.solve('F = ?'); // Returns 50
```

#### **Glassmorphism Components**

```jsx
// src/components/common/GlassCard.jsx
export default function GlassCard({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white/10 backdrop-blur-md
        border border-white/20
        rounded-2xl
        shadow-lg shadow-black/20
        transition-all duration-300
        hover:bg-white/15 hover:shadow-xl
        ${className}
      `}
    >
      {children}
    </div>
  );
}
```

#### **Notebook List Page**

```jsx
// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotebooks, createNotebook } from '../lib/db';
import GlassCard from '../components/common/GlassCard';

export default function Home() {
  const [notebooks, setNotebooks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotebooks();
  }, []);

  const loadNotebooks = async () => {
    const data = await getNotebooks();
    setNotebooks(data);
  };

  const handleCreateNotebook = async () => {
    const name = prompt('Notebook name:');
    if (name) {
      await createNotebook(name);
      loadNotebooks();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary font-sans">
            IntelliNote
          </h1>
          <button
            onClick={handleCreateNotebook}
            className="px-6 py-3 bg-primary hover:bg-primary-light 
                     rounded-lg text-white font-medium transition-colors"
          >
            + New Notebook
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notebooks.map((notebook) => (
            <GlassCard
              key={notebook.id}
              onClick={() => navigate(`/notebook/${notebook.id}`)}
              className="p-6 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-lg"
                  style={{ backgroundColor: notebook.color }}
                />
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">
                    {notebook.name}
                  </h3>
                  <p className="text-text-muted text-sm">
                    {new Date(notebook.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 7. Data Models

### Notebook Schema
```javascript
{
  id: number (auto-increment),
  name: string,
  color: string (hex),
  createdAt: Date,
  updatedAt: Date,
}
```

### Note Schema
```javascript
{
  id: number (auto-increment),
  notebookId: number (foreign key),
  title: string,
  canvasData: string (JSON serialized Fabric.js canvas),
  createdAt: Date,
  updatedAt: Date,
  synced: boolean,
}
```

### Pending Sync Schema
```javascript
{
  id: number (auto-increment),
  action: string ('create' | 'update' | 'delete'),
  data: object,
  timestamp: Date,
}
```

---

## 8. Sync Strategy

### Offline-First Approach

1. **All operations happen locally first**
   - Immediate response to user actions
   - No waiting for network

2. **Background sync when online**
   - Use Background Sync API
   - Queue changes in `pendingSync` table
   - Sync automatically when connection restored

3. **Conflict Resolution**
   - Timestamp-based (last-write-wins)
   - Optional: Manual conflict resolution UI

### Firebase Integration

```javascript
// src/lib/syncEngine.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { db as localDB } from './db';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export async function syncNotebooks() {
  const notebooks = await localDB.notebooks.toArray();
  
  for (const notebook of notebooks) {
    await setDoc(doc(firestore, 'notebooks', String(notebook.id)), {
      ...notebook,
      userId: 'current-user-id', // Get from auth
    });
  }
}

export async function syncNotes() {
  const notes = await localDB.notes.where('synced').equals(false).toArray();
  
  for (const note of notes) {
    await setDoc(doc(firestore, 'notes', String(note.id)), {
      ...note,
      userId: 'current-user-id',
    });
    
    // Mark as synced
    await localDB.notes.update(note.id, { synced: true });
  }
}

// Auto-sync every 30 seconds when online
setInterval(() => {
  if (navigator.onLine) {
    syncNotebooks();
    syncNotes();
  }
}, 30000);
```

---

## 9. Testing & Deployment

### Testing Strategy

1. **Unit Tests** (Jest + React Testing Library)
   - Math solver functions
   - Database operations
   - Utility functions

2. **Integration Tests**
   - Canvas operations
   - Sync engine
   - OCR pipeline

3. **E2E Tests** (Playwright)
   - User flows
   - Cross-browser compatibility

4. **Device Testing**
   - Windows (Chrome, Edge, Firefox)
   - iOS Safari
   - Pen tablet testing

### Deployment

#### **Hosting Options (Free Tier)**

1. **Vercel** (Recommended)
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Netlify**
   ```bash
   npm run build
   # Deploy dist folder
   ```

3. **Firebase Hosting**
   ```bash
   npm install -g firebase-tools
   firebase init hosting
   firebase deploy
   ```

#### **PWA Installation**

- Users can install from browser menu
- iOS: Safari → Share → Add to Home Screen
- Windows: Chrome → Install IntelliNote

---

## 10. Next Steps

### Immediate Actions

1. **Set up development environment**
   ```bash
   git clone <your-repo>
   npm install
   npm run dev
   ```

2. **Start with Phase 1**
   - Follow the roadmap sequentially
   - Test each feature before moving on

3. **Iterate on math OCR**
   - Start simple (typed equations)
   - Gradually add handwriting recognition
   - Test with real physics/math problems

### Future Enhancements

- [ ] Collaborative editing
- [ ] Export to PDF
- [ ] Voice-to-text notes
- [ ] Image OCR for textbook problems
- [ ] Formula library/templates
- [ ] Study mode with spaced repetition
- [ ] Graph plotting for functions

---

## 📚 Resources

- **React Docs:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com
- **Fabric.js:** http://fabricjs.com
- **Math.js:** https://mathjs.org
- **Dexie.js:** https://dexie.org
- **Firebase:** https://firebase.google.com
- **PWA Guide:** https://web.dev/progressive-web-apps/

---

## 🎯 Success Metrics

- Fast load time (< 2s)
- Smooth drawing (60fps)
- Accurate math solving (>90%)
- Works offline completely
- Cross-platform consistency

---

**You're ready to build IntelliNote!** 🚀

Start with Phase 1, and feel free to ask for help with any specific implementation details. Good luck with your project!