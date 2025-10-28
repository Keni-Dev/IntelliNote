# 🎨 Quick Draw Reference - What to Test

A quick visual reference of what to draw to test each feature of your Math API.

---

## ✅ Essential Tests (Do These First!)

### 1. Linear Equation
```
Draw: x + 3 = 0
Expected: x = -3
```

### 2. Quadratic Equation
```
Draw: x² + 3x + 2 = 0
Expected: x = -1, x = -2
```

### 3. Simple Derivative
```
Draw: derivative of x²
   or: d/dx(x²)
Expected: 2x
```

### 4. Basic Physics
```
Draw: F = m*a
Expected: Solves for any variable
```

---

## 🔢 ALGEBRA

### Linear Equations
| Draw | Expected Result |
|------|----------------|
| `x + 3 = 0` | x = -3 |
| `2x - 5 = 0` | x = 2.5 or x = 5/2 |
| `3x + 7 = 15` | x = 8/3 |

### Quadratic Equations
| Draw | Expected Result |
|------|----------------|
| `x² + 3x + 2 = 0` | x = -1, x = -2 |
| `x² - 5x + 6 = 0` | x = 2, x = 3 |
| `2x² + 4x - 6 = 0` | x = 1, x = -3 |

### Multi-Variable
| Draw | Note |
|------|------|
| `2x + 3y = 10` | Returns parametric solution |
| `x² + y² = 25` | Circle equation |

---

## 📊 CALCULUS - Derivatives

| Draw | Expected Result |
|------|----------------|
| `derivative of x²` | 2x |
| `d/dx(x³)` | 3x² |
| `d/dx(sin(x))` | cos(x) |
| `d/dx(3x² + 2x)` | 6x + 2 |
| `derivative of e^x` | e^x |
| `d/dx(x² * sin(x))` | Product rule applied |

---

## ∫ CALCULUS - Integrals

### Indefinite Integrals
| Draw | Expected Result |
|------|----------------|
| `integral of x²` | x³/3 + C |
| `∫ 3x² + 2x` | x³ + x² + C |
| `integrate sin(x)` | -cos(x) + C |

### Definite Integrals
| Draw | Expected Result |
|------|----------------|
| `integral of x² from 0 to 1` | 1/3 |
| `∫ x dx [0, 2]` | 2 |

---

## 🎯 CALCULUS - Limits

| Draw | Expected Result |
|------|----------------|
| `lim x→0 (sin(x)/x)` | 1 |
| `limit as x approaches infinity of 1/x` | 0 |
| `lim x→∞ (1/x)` | 0 |

---

## ⚡ PHYSICS - Kinematics

| Draw | Variables to Solve |
|------|-------------------|
| `v = u + at` | v, u, a, t |
| `s = ut + ½at²` | s, u, a, t |
| `v² = u² + 2as` | v, u, a, s |

**Legend:**
- v = final velocity
- u = initial velocity
- a = acceleration
- t = time
- s = displacement

---

## 💪 PHYSICS - Force & Energy

| Draw | What It Is |
|------|-----------|
| `F = ma` | Newton's 2nd Law |
| `E = mc²` | Einstein's mass-energy |
| `KE = ½mv²` | Kinetic energy |
| `PE = mgh` | Potential energy |

---

## ⚡ PHYSICS - Electricity

| Draw | What It Is |
|------|-----------|
| `V = IR` | Ohm's Law |
| `P = VI` | Power (watts) |
| `P = I²R` | Power (resistance form) |

**Legend:**
- V = voltage (volts)
- I = current (amperes)
- R = resistance (ohms)
- P = power (watts)

---

## 📐 TRIGONOMETRY

| Draw | Expected Type |
|------|--------------|
| `sin(x) = 0.5` | Solve for x |
| `cos(x) = 1` | x = 0 (or 2πn) |
| `tan(x) = 1` | x = π/4 (or π/4 + πn) |
| `sin²(x) + cos²(x) = 1` | Identity (true) |

---

## 🎨 LaTeX Edge Cases

### Braces in Exponents
```
Draw: x^{2} + 3x + 2 = 0
Test: Should parse x^{2} as x²
```

### Fractions
```
Draw: \frac{x}{2} = 1
Test: Should convert to x/2
Expected: x = 2
```

### Square Roots
```
Draw: \sqrt{x} = 4
Test: Should convert to sqrt(x)
Expected: x = 16
```

### Implicit Multiplication
```
Draw: 3x + 2y = 10
Test: Should parse 3x as 3*x
```

### Multiplication Operators
```
Draw: a \cdot b = 10
  or: a \times b = 10
Test: Should convert to a*b
```

---

## 🔍 Variable Detection

### Explicit Instructions
```
Draw: solve for x: 2x + 3 = 0
Test: Should extract x as variable

Draw: find y: y² = 16
Test: Should extract y as variable

Draw: what is z: 3z = 12
Test: Should extract z as variable
```

### Auto-Detection
```
Draw: x² + 3x + 2 = 0
Test: Should auto-detect x

Draw: 2y + 5 = 0
Test: Should auto-detect y
```

---

## 🔧 Operations

### Simplify
```
Draw: simplify (x+2)(x-2)
Expected: x² - 4

Draw: expand (a+b)²
Expected: a² + 2ab + b²
```

### Factor
```
Draw: factor x² + 5x + 6
Expected: (x+2)(x+3)

Draw: factor x² - 9
Expected: (x-3)(x+3)
```

---

## ❌ Error Cases (Should NOT Crash!)

| Draw | Expected Behavior |
|------|------------------|
| `0 = 1` | Returns error or empty solutions |
| `x/0 = 5` | Returns error about division by zero |
| `asdfghjkl` | Returns parsing error |
| `x^{2` | Handles malformed LaTeX gracefully |

---

## ⚡ Performance Testing

### Fast Path (with hint)
```
1. Set note_type = "algebra"
2. Draw: x² + 3x + 2 = 0
3. Check latency: Should be < 50ms
```

### Slow Path (auto-detect)
```
1. Set note_type = "auto" or leave blank
2. Draw: x² + 3x + 2 = 0
3. Check latency: Will be > 50ms (classification overhead)
```

---

## 📋 Daily Testing Routine

### Quick Smoke Test (5 minutes)
1. ✅ `x + 3 = 0` → x = -3
2. ✅ `x² + 3x + 2 = 0` → Two roots
3. ✅ `d/dx(x²)` → 2x
4. ✅ `F = m*a` → Physics works

### Standard Test (15 minutes)
- Run all essential tests above
- Test 2-3 items from each category
- Check one LaTeX edge case
- Test one error case

### Comprehensive Test (1 hour)
- Follow MATH_API_TESTING.md
- Run pytest suite
- Use HTML tester for visual verification
- Check performance with/without hints

---

## 🎯 Test Priority Order

**Priority 1 - Core Functionality:**
1. Linear equations
2. Quadratic equations
3. Basic derivatives
4. Physics formulas

**Priority 2 - Advanced Math:**
5. Integrals
6. Limits
7. Trigonometry
8. Multi-variable

**Priority 3 - Edge Cases:**
9. LaTeX formatting
10. Variable detection
11. Simplify/Factor
12. Error handling

**Priority 4 - Quality:**
13. Performance testing
14. Response formatting
15. Step-by-step explanations
16. Math history logging

---

## 💡 Tips for Drawing

1. **Be clear with operators:**
   - Use `*` for multiplication: `2*x` not `2x` (though both should work)
   - Use `^` for exponents: `x^2` or `x^{2}`
   - Use `=` for equations

2. **Common symbols:**
   - Derivative: `d/dx` or write "derivative of"
   - Integral: `∫` or write "integral of"
   - Limit: `lim` or write "limit as"

3. **For physics:**
   - Be explicit: `F = m*a` not `Fma`
   - Use standard variables: v, u, a, t, s, F, m, etc.

4. **Variables:**
   - Single letters work best: x, y, z, t, v, etc.
   - Avoid reserved words: e, i, pi (unless you mean the constants)

5. **Testing mode:**
   - Use note_type hints for faster results
   - Use auto-detect to verify classification
   - Check math_history.jsonl for performance data

---

## 📊 Expected Results Summary

| Category | Expected Success Rate |
|----------|---------------------|
| Basic Algebra | 100% |
| Advanced Algebra | 95% |
| Calculus | 90% |
| Physics | 95% |
| Trigonometry | 90% |
| LaTeX Edge Cases | 85% |
| Error Handling | 100% (no crashes) |

---

## 🚀 Quick Start Commands

```powershell
# Start server
python server/ocr_service_fast.py

# Run automated tests
pytest server/test_math_api.py -v

# Open HTML tester
start math_tester.html

# Quick curl test
curl -X POST http://localhost:8000/solve_math -H "Content-Type: application/json" -d "{\"equation\": \"x+3=0\", \"note_type\": \"algebra\"}"
```

---

**Print this file or keep it open while testing!** 📄✨
