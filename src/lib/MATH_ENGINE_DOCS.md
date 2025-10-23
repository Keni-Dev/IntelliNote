# Math Engine Documentation

## Overview

The Math Engine is a comprehensive mathematical computation system for IntelliNote that handles equation parsing, variable management, formula storage, and solving.

## Core Features

### 1. **Equation Parsing**
Automatically detects and parses different types of mathematical inputs:
- Simple expressions: `2 + 3`
- Equations: `x = 5`
- Formulas: `F = m * a`

### 2. **Variable Management**
Store and retrieve variables with automatic type handling:
```javascript
import { mathEngine } from './lib/mathEngine.js';

mathEngine.storeVariable('x', 5);
mathEngine.storeVariable('y', 10);
console.log(mathEngine.getVariable('x')); // 5
```

### 3. **Formula Storage**
Save formulas for reuse:
```javascript
mathEngine.storeFormula('velocity', 'd / t');
mathEngine.storeFormula('force', 'm * a');
```

### 4. **Intelligent Solving**
The engine automatically determines the best solving strategy:

#### Direct Assignment
```javascript
const result = mathEngine.solve('x = 5');
// Stores x = 5
```

#### Expression Evaluation
```javascript
const result = mathEngine.solve('2 + 3');
// Returns { success: true, result: 5 }
```

#### Formula with Known Variables
```javascript
mathEngine.solve('m = 5');
mathEngine.solve('a = 10');
const result = mathEngine.solve('F = m * a');
// Returns { success: true, result: 50 }
```

#### Solve for Unknown
```javascript
mathEngine.solve('F = 50');
mathEngine.solve('m = 5');
const result = mathEngine.solve('F = m * a');
// Automatically solves: a = 10
```

## Formula Library

The formula library includes common formulas from:

### Physics
- **Kinematics**: velocity, acceleration, distance
- **Dynamics**: Newton's laws, momentum, weight
- **Energy**: kinetic, potential, work, power
- **Electricity**: Ohm's law, electric power
- **Relativity**: E = mc²

### Mathematics
- **Geometry**: area and perimeter (rectangles, circles, triangles)
- **3D Shapes**: volume and surface area (spheres, cylinders, cones)
- **Algebra**: quadratic formula, slope-intercept form

### Chemistry
- **Gas Laws**: ideal gas law (PV = nRT)
- **Properties**: density, molarity
- **Stoichiometry**: moles from mass

## Usage Examples

### Example 1: Basic Calculation
```javascript
import { mathEngine } from './lib/mathEngine.js';

const result = mathEngine.solve('2 + 3 * 4');
console.log(result.result); // 14
```

### Example 2: Physics Problem
```javascript
// Calculate force given mass and acceleration
mathEngine.solve('m = 10'); // mass = 10 kg
mathEngine.solve('a = 5');  // acceleration = 5 m/s²
const result = mathEngine.solve('F = m * a');
console.log(result.result); // 50 N
```

### Example 3: Solve for Unknown
```javascript
// Given force and mass, find acceleration
mathEngine.solve('F = 100'); // force = 100 N
mathEngine.solve('m = 20');  // mass = 20 kg
const result = mathEngine.solve('F = m * a');
console.log(result.result); // 5 m/s² (solved for a)
```

### Example 4: Using Formula Library
```javascript
import { getFormulaById, searchFormulas } from './lib/formulaLibrary.js';

// Get a specific formula
const velocityFormula = getFormulaById('velocity');
console.log(velocityFormula.expression); // 'v = d / t'

// Search for formulas
const energyFormulas = searchFormulas('energy');
energyFormulas.forEach(f => console.log(f.name));
```

### Example 5: Geometry Calculation
```javascript
// Calculate circle area
mathEngine.solve('r = 5'); // radius = 5
const result = mathEngine.solve('A = pi * r^2');
console.log(result.result); // ~78.54
```

### Example 6: Step-by-Step Solution
```javascript
const result = mathEngine.solve('F = m * a');
console.log(result.steps);
// Shows all intermediate steps:
// 1. Parse equation
// 2. Identify variables
// 3. Check for known/unknown variables
// 4. Apply solving strategy
// 5. Return result
```

## API Reference

### MathEngine Class

#### Methods

**`parseEquation(text)`**
- Parses equation string into components
- Returns: `{ left, right, isEquation }`

**`extractVariables(expression)`**
- Extracts all variables from an expression
- Returns: Array of variable names

**`storeVariable(name, value)`**
- Stores a variable with its value
- Supports numbers, expressions, and units

**`storeFormula(name, expression)`**
- Stores a formula for future use
- Validates expression syntax

**`solve(equation)`**
- Main solving method
- Returns: `{ success, result, steps, type }`

**`evaluate(expression)`**
- Evaluates a mathematical expression
- Returns: Numeric result

**`getVariable(name)`**
- Retrieves stored variable value

**`getFormula(name)`**
- Retrieves stored formula expression

**`clearVariable(name)`**
- Removes a specific variable

**`reset()`**
- Clears all variables and formulas

### Formula Library Functions

**`getFormulaById(id)`**
- Get formula by ID
- Returns: Formula object

**`getFormulasByCategory(category)`**
- Get all formulas in a category (physics, math, chemistry)
- Returns: Array of formulas

**`searchFormulas(query)`**
- Search formulas by name or description
- Returns: Array of matching formulas

**`getAllFormulas()`**
- Get all available formulas
- Returns: Array of all formulas

## Error Handling

The engine provides detailed error messages for:

- **Invalid Syntax**: `"Parse error: unexpected token"`
- **Missing Variables**: `"Cannot solve: variable 'x' not defined"`
- **Division by Zero**: Returns `Infinity`
- **Multiple Unknowns**: `"Cannot solve: multiple unknown variables"`
- **Reserved Names**: `"Cannot use reserved function name: sin"`

## Supported Operations

### Arithmetic
- Addition: `+`
- Subtraction: `-`
- Multiplication: `*`
- Division: `/`
- Exponentiation: `^` or `**`
- Modulo: `%`

### Functions
- Trigonometric: `sin()`, `cos()`, `tan()`, `asin()`, `acos()`, `atan()`
- Hyperbolic: `sinh()`, `cosh()`, `tanh()`
- Logarithmic: `log()`, `ln()`, `log10()`, `log2()`
- Other: `sqrt()`, `abs()`, `ceil()`, `floor()`, `round()`

### Constants
- `pi`: π (3.14159...)
- `e`: Euler's number (2.71828...)
- `tau`: τ = 2π
- `phi`: Golden ratio

## Testing

Run the test suite:
```javascript
import './lib/mathEngine.test.js';
```

The test suite includes:
- 50+ unit tests
- Coverage for all methods
- Edge cases and error conditions
- Real-world scenarios

## Performance Considerations

- **Variable Lookup**: O(1) using Map
- **Formula Storage**: O(1) using Map
- **Expression Evaluation**: Depends on complexity
- **Algebraic Solving**: O(n) for linear equations
- **Numerical Solving**: O(n) iterations, typically < 10

## Future Enhancements

Potential additions:
- Matrix operations
- Complex numbers
- Symbolic differentiation
- Integral solving
- System of equations
- Unit conversion
- Graph plotting support

## Integration with IntelliNote

The Math Engine integrates with:
1. **Math Input Component**: For entering equations
2. **Math Symbol Picker**: For inserting symbols
3. **Canvas Notes**: For displaying results
4. **Formula Library UI**: For browsing formulas

## Examples in Context

### In a Note
```javascript
// User types in note:
"Given: m = 10 kg, a = 5 m/s²"
"Find: F = ?"

// Math engine processes:
mathEngine.solve('m = 10');
mathEngine.solve('a = 5');
const result = mathEngine.solve('F = m * a');

// Display in note:
"Result: F = 50 N"
```

### Chemistry Problem
```javascript
// Ideal gas law calculation
mathEngine.solve('P = 101325'); // 1 atm in Pa
mathEngine.solve('V = 0.0224');  // 22.4 L in m³
mathEngine.solve('R = 8.314');   // Gas constant
mathEngine.solve('T = 273');     // 0°C in K

const result = mathEngine.solve('P * V = n * R * T');
// Solves for n (number of moles) = 1
```

## Tips

1. **Variable Names**: Use descriptive names for clarity
2. **Units**: Track units in variable names (e.g., `velocity_ms` for m/s)
3. **Formulas**: Store commonly used formulas for reuse
4. **Steps**: Use the steps array for showing work
5. **Clear**: Reset engine between different problems

## License

Part of IntelliNote - MIT License
