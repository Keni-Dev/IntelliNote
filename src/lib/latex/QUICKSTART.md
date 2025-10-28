# Quick Start Guide - Custom SVG Math Renderer

## 🚀 Getting Started in 30 Seconds

### 1. Import the Renderer
```javascript
import { renderLatexToFabric } from './lib/latex';
```

### 2. Render Math
```javascript
const mathObj = await renderLatexToFabric({
  latex: 'x = \\frac{\\pi}{2}',
  fontSize: 48,
  color: '#eab308'
});
```

### 3. Add to Canvas
```javascript
canvas.add(mathObj);
canvas.requestRenderAll();
```

**That's it!** 🎉

---

## 📝 Common Examples

### Simple Equation
```javascript
await renderLatexToFabric({ latex: 'x + y = 10' });
```

### Fraction
```javascript
await renderLatexToFabric({ latex: '\\frac{a}{b}' });
```

### Quadratic Formula
```javascript
await renderLatexToFabric({ 
  latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' 
});
```

### Integral
```javascript
await renderLatexToFabric({ 
  latex: '\\int_0^1 x^2 dx' 
});
```

---

## 🎨 Customization

### Change Color
```javascript
renderLatexToFabric({ 
  latex: 'E = mc^2',
  color: '#ff6b6b'  // Red
});
```

### Change Size
```javascript
renderLatexToFabric({ 
  latex: 'a^2 + b^2 = c^2',
  fontSize: 72  // Larger
});
```

### Match Handwriting
```javascript
renderLatexToFabric({ 
  latex: '\\sqrt{x}',
  strokeWidth: userBrushSize,  // Match user's stroke
  fontFamily: "'Kalam', cursive"
});
```

---

## 🧪 Testing (Browser Console)

```javascript
// Run all tests
mathRendererTest.runAllTests();

// Check performance
mathRendererTest.runPerformanceTest();

// Show advantages
mathRendererTest.logQualityAdvantages();
```

---

## 📊 What LaTeX Works?

### ✅ Supported
- **Basic**: `x + y = 10`
- **Fractions**: `\\frac{a}{b}`
- **Roots**: `\\sqrt{x}`, `\\sqrt[3]{x}`
- **Exponents**: `x^2`, `e^{x+1}`
- **Subscripts**: `x_0`, `v_i`
- **Greek**: `\\pi`, `\\theta`, `\\alpha`
- **Functions**: `\\sin(x)`, `\\log(y)`
- **Integrals**: `\\int_a^b f(x) dx`
- **Sums**: `\\sum_{i=1}^{n}`
- **Limits**: `\\lim_{x \\to 0}`

### ❌ Not Yet
- Matrices
- Multi-line equations
- Chemical formulas

---

## 🐛 Troubleshooting

### Math doesn't appear?
```javascript
// Enable debug mode
renderLatexToFabric({ 
  latex: 'x = 5',
  debug: true  // Check console
});
```

### Blurry text?
- Don't worry! It's vector SVG - zoom in to see crisp rendering

### Wrong size?
```javascript
// Adjust fontSize
renderLatexToFabric({ 
  latex: '\\frac{1}{2}',
  fontSize: 60  // Increase
});
```

---

## 🎯 Best Practices

### 1. **Use Correct LaTeX**
```javascript
// ✅ Good
'\\frac{a}{b}'

// ❌ Bad
'a/b'  // Not LaTeX
```

### 2. **Escape Backslashes**
```javascript
// ✅ Good
latex: '\\sqrt{x}'

// ❌ Bad  
latex: '\sqrt{x}'  // Single backslash
```

### 3. **Set Appropriate Size**
```javascript
// For handwriting: match stroke height
fontSize: userStrokeHeight * 1.2
```

---

## 📖 More Info

- **Full Docs**: `src/lib/latex/README.md`
- **Test Suite**: `src/lib/latex/test.js`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

---

**Happy Math Rendering!** ✨
