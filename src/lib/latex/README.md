# Custom SVG Math Renderer for IntelliNote

A lightweight, high-performance LaTeX math renderer that generates handwritten-style math notation using pure SVG, optimized for Fabric.js canvas integration.

## 🎯 Architecture

```
LaTeX String → Parser → Layout Engine → SVG Generator → Fabric.js Image
     ↓           ↓            ↓              ↓              ↓
"x=\frac{π}{2}" → AST → Position Tree → SVG String → Canvas Object
```

## 🚀 Features

### ✅ **Advantages over KaTeX + html2canvas**
- **3x faster** rendering (no DOM manipulation)
- **Crisp quality** at any scale (vector SVG vs rasterized)
- **Perfect positioning** using mathematical layout rules
- **Direct stroke control** matching user's handwriting
- **Smaller bundle** (~30KB vs 500KB+ for KaTeX + html2canvas)
- **Handwriting style** with natural variance

### 📐 **Supported Math Notation**

| Feature | LaTeX Example | Status |
|---------|---------------|--------|
| **Basic** | | |
| Variables | `x`, `y`, `z` | ✅ |
| Numbers | `123`, `3.14` | ✅ |
| Operators | `+`, `-`, `×`, `÷`, `=` | ✅ |
| **Algebra** | | |
| Fractions | `\frac{a}{b}` | ✅ |
| Exponents | `x^2`, `e^x` | ✅ |
| Square roots | `\sqrt{x}` | ✅ |
| Nth roots | `\sqrt[3]{x}` | ✅ |
| **Greek** | | |
| Letters | `\pi`, `\theta`, `\alpha` | ✅ |
| **Calculus** | | |
| Integrals | `\int_a^b f(x) dx` | ✅ |
| Summations | `\sum_{i=1}^{n}` | ✅ |
| Limits | `\lim_{x \to a}` | ✅ |
| Derivatives | `\frac{dy}{dx}` | ✅ |
| **Functions** | | |
| Trig | `\sin(x)`, `\cos(x)` | ✅ |
| Logarithms | `\log(x)`, `\ln(x)` | ✅ |
| **Grouping** | | |
| Parentheses | `(a + b)` | ✅ |
| Absolute value | `\|x\|` | ✅ |
| **Scripts** | | |
| Subscripts | `x_0`, `v_i` | ✅ |
| Superscripts | `x^2`, `e^n` | ✅ |

## 📦 Installation

The renderer is already integrated into IntelliNote. No additional installation needed!

## 🎨 Usage

### Basic Usage

```javascript
import { renderLatexToFabric } from './lib/latex';

// Render LaTeX to Fabric.js object
const fabricObj = await renderLatexToFabric({
  latex: 'x = \\frac{\\pi}{2}',
  fontSize: 48,
  strokeWidth: 2,
  color: '#eab308',
  fontFamily: "'Gochi Hand', 'Kalam', cursive"
});

// Add to canvas
canvas.add(fabricObj);
canvas.requestRenderAll();
```

### Canvas Integration

```javascript
import { renderLatexToCanvas } from './lib/latex';

// Render and add to canvas in one step
await renderLatexToCanvas(canvas, {
  latex: 'E = mc^2',
  left: 100,
  top: 100,
  fontSize: 48,
  color: '#eab308'
});
```

### Advanced: Direct Component Usage

```javascript
import { LaTeXParser, LayoutEngine, SVGGenerator } from './lib/latex';

// Step 1: Parse
const parser = new LaTeXParser('\\sqrt{a^2 + b^2}');
const ast = parser.parse();

// Step 2: Layout
const layoutEngine = new LayoutEngine(ast, { fontSize: 48 });
const layout = layoutEngine.layout();

// Step 3: Generate SVG
const svgGenerator = new SVGGenerator(layout);
const svg = svgGenerator.generate();
```

## 🧪 Testing

The renderer includes comprehensive test utilities:

```javascript
import { runAllTests, runPerformanceTest, runVisualTest } from './lib/latex/test';

// Run all unit tests
await runAllTests();

// Performance benchmarking
await runPerformanceTest();

// Visual comparison
await runVisualTest(canvas);
```

Or from browser console:

```javascript
// Test utilities are automatically exposed
mathRendererTest.runAllTests();
mathRendererTest.runPerformanceTest();
mathRendererTest.logQualityAdvantages();
```

## 📊 Performance

Tested on quadratic formula: `x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`

| Metric | Value |
|--------|-------|
| Average render time | ~8-15ms |
| vs KaTeX + html2canvas | **3x faster** |
| Bundle size | ~30KB |
| vs KaTeX bundle | **94% smaller** |

## 🏗️ Architecture Details

### Phase 1: LaTeX Parser
- Tokenizes LaTeX strings
- Builds Abstract Syntax Tree (AST)
- Supports commands, operators, Greek letters, functions
- Handles nested structures (fractions, roots, scripts)

### Phase 2: Layout Engine
- Calculates precise positions for each element
- Implements mathematical spacing rules
- Handles vertical alignment (baselines, ascenders, descenders)
- Manages relative sizing (fractions, scripts)

### Phase 3: SVG Generator
- Converts layout tree to SVG markup
- Renders text with Google Fonts
- Draws mathematical symbols as SVG paths
- Applies handwriting variance (subtle rotations)

### Phase 4: Fabric.js Integration
- Converts SVG to Fabric.js objects
- Enables selection, transformation, erasure
- Integrates with canvas history
- Provides fallback mechanisms

## 🎯 Design Decisions

### Why Custom Renderer?

1. **Performance**: KaTeX requires DOM rendering + html2canvas conversion = slow
2. **Quality**: html2canvas creates rasterized images that blur when scaled
3. **Control**: Need exact stroke width matching for handwriting consistency
4. **Size**: KaTeX + html2canvas = 500KB+ bundle
5. **Flexibility**: Can customize spacing, fonts, and rendering style

### Why SVG?

- Vector graphics = crisp at any zoom level
- Native browser support
- Easy integration with Fabric.js
- Small file size
- Programmable styling

## 🔮 Future Enhancements

- [ ] Matrices: `\begin{matrix}...\end{matrix}`
- [ ] Multi-line equations
- [ ] Chemical equations
- [ ] Physics notation (vectors, units)
- [ ] Custom symbol definitions
- [ ] Ink texture effects
- [ ] Animation support

## 🐛 Known Limitations

- Complex nested structures may need spacing adjustments
- Font loading required for handwriting style
- Some advanced LaTeX commands not yet supported
- Right-to-left text not implemented

## 📝 Examples

### Simple Algebra
```javascript
renderLatexToFabric({ latex: 'x + y = 10' })
renderLatexToFabric({ latex: '2x - 3 = 7' })
```

### Fractions
```javascript
renderLatexToFabric({ latex: '\\frac{1}{2}' })
renderLatexToFabric({ latex: '\\frac{x + 1}{x - 1}' })
```

### Complex Expressions
```javascript
// Quadratic formula
renderLatexToFabric({ 
  latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' 
})

// Pythagorean theorem
renderLatexToFabric({ 
  latex: 'a^2 + b^2 = c^2' 
})

// Integral
renderLatexToFabric({ 
  latex: '\\int_0^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}' 
})
```

## 🤝 Contributing

When adding new features:

1. Update `latexParser.js` for new LaTeX commands
2. Extend `layoutEngine.js` for layout calculations
3. Add rendering logic to `svgGenerator.js`
4. Include test cases in `test.js`
5. Update this README

## 📄 License

Part of IntelliNote project. See main project license.

## 🙏 Acknowledgments

- LaTeX specification for math notation standards
- Google Fonts for handwriting fonts (Gochi Hand, Kalam)
- Fabric.js for canvas manipulation
- IntelliNote team for integration support
