/**
 * Tests for MathEngine
 * Comprehensive test suite covering all methods and edge cases
 */

import { MathEngine } from './mathEngine.js';

/**
 * Test runner - simple test framework
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🧪 Running MathEngine Tests\n');
    console.log('='.repeat(60));

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.error(`❌ ${name}`);
        console.error(`   ${error.message}`);
      }
    }

    console.log('='.repeat(60));
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    console.log(`Total: ${this.tests.length} tests\n`);

    return this.failed === 0;
  }
}

/**
 * Assertion helpers
 */
function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(
      `${message}\n  Expected: ${expected}\n  Actual: ${actual}`
    );
  }
}

function assertDeepEqual(actual, expected, message = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      `${message}\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`
    );
  }
}

function assertApproximately(actual, expected, tolerance = 1e-10, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `${message}\n  Expected: ~${expected}\n  Actual: ${actual}\n  Tolerance: ${tolerance}`
    );
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(message || 'Expected condition to be false');
  }
}

function assertThrows(fn, message = '') {
  try {
    fn();
    throw new Error(message || 'Expected function to throw an error');
  } catch (error) {
    // Expected to throw
    if (error.message.includes('Expected function to throw')) {
      throw error;
    }
  }
}

/**
 * Test Suite
 */
const runner = new TestRunner();

// ==================== PARSING TESTS ====================

runner.test('parseEquation: simple equation', () => {
  const engine = new MathEngine();
  const result = engine.parseEquation('x = 5');
  assertEqual(result.left, 'x');
  assertEqual(result.right, '5');
  assertTrue(result.isEquation);
});

runner.test('parseEquation: expression without equals', () => {
  const engine = new MathEngine();
  const result = engine.parseEquation('2 + 3');
  assertEqual(result.left, null);
  assertEqual(result.right, '2 + 3');
  assertFalse(result.isEquation);
});

runner.test('parseEquation: complex equation', () => {
  const engine = new MathEngine();
  const result = engine.parseEquation('F = m * a');
  assertEqual(result.left, 'F');
  assertEqual(result.right, 'm * a');
  assertTrue(result.isEquation);
});

runner.test('parseEquation: equation with spaces', () => {
  const engine = new MathEngine();
  const result = engine.parseEquation('  y  =  10 + x  ');
  assertEqual(result.left, 'y');
  assertEqual(result.right, '10 + x');
  assertTrue(result.isEquation);
});

runner.test('parseEquation: multiple equals signs should throw', () => {
  const engine = new MathEngine();
  assertThrows(() => engine.parseEquation('x = y = 5'));
});

// ==================== VARIABLE EXTRACTION TESTS ====================

runner.test('extractVariables: single variable', () => {
  const engine = new MathEngine();
  const vars = engine.extractVariables('x');
  assertDeepEqual(vars.sort(), ['x']);
});

runner.test('extractVariables: multiple variables', () => {
  const engine = new MathEngine();
  const vars = engine.extractVariables('m * a');
  assertDeepEqual(vars.sort(), ['a', 'm']);
});

runner.test('extractVariables: with numbers', () => {
  const engine = new MathEngine();
  const vars = engine.extractVariables('2 * x + 3 * y');
  assertDeepEqual(vars.sort(), ['x', 'y']);
});

runner.test('extractVariables: exclude functions', () => {
  const engine = new MathEngine();
  const vars = engine.extractVariables('sin(x) + cos(y)');
  assertDeepEqual(vars.sort(), ['x', 'y']);
});

runner.test('extractVariables: exclude constants', () => {
  const engine = new MathEngine();
  const vars = engine.extractVariables('pi * r^2');
  assertDeepEqual(vars.sort(), ['r']);
});

runner.test('extractVariables: complex expression', () => {
  const engine = new MathEngine();
  const vars = engine.extractVariables('sqrt(a^2 + b^2)');
  assertDeepEqual(vars.sort(), ['a', 'b']);
});

runner.test('extractVariables: multi-character variables', () => {
  const engine = new MathEngine();
  const vars = engine.extractVariables('velocity * time');
  assertDeepEqual(vars.sort(), ['time', 'velocity']);
});

// ==================== VARIABLE STORAGE TESTS ====================

runner.test('storeVariable: store number', () => {
  const engine = new MathEngine();
  engine.storeVariable('x', 5);
  assertEqual(engine.getVariable('x'), 5);
});

runner.test('storeVariable: store string number', () => {
  const engine = new MathEngine();
  engine.storeVariable('y', '10');
  assertEqual(engine.getVariable('y'), 10);
});

runner.test('storeVariable: store expression', () => {
  const engine = new MathEngine();
  engine.storeVariable('x', 5);
  engine.storeVariable('y', '2 * x');
  assertEqual(engine.getVariable('y'), 10);
});

runner.test('storeVariable: reject reserved function names', () => {
  const engine = new MathEngine();
  assertThrows(() => engine.storeVariable('sin', 5));
});

runner.test('storeVariable: reject invalid name', () => {
  const engine = new MathEngine();
  assertThrows(() => engine.storeVariable('', 5));
  assertThrows(() => engine.storeVariable(null, 5));
});

runner.test('storeVariable: overwrite existing', () => {
  const engine = new MathEngine();
  engine.storeVariable('x', 5);
  engine.storeVariable('x', 10);
  assertEqual(engine.getVariable('x'), 10);
});

// ==================== FORMULA STORAGE TESTS ====================

runner.test('storeFormula: basic formula', () => {
  const engine = new MathEngine();
  engine.storeFormula('F', 'm * a');
  assertEqual(engine.getFormula('F'), 'm * a');
});

runner.test('storeFormula: reject reserved names', () => {
  const engine = new MathEngine();
  assertThrows(() => engine.storeFormula('cos', 'x + 1'));
});

runner.test('storeFormula: reject invalid expression', () => {
  const engine = new MathEngine();
  assertThrows(() => engine.storeFormula('F', '2 + + 3'));
});

runner.test('storeFormula: complex formula', () => {
  const engine = new MathEngine();
  engine.storeFormula('KE', '0.5 * m * v^2');
  assertEqual(engine.getFormula('KE'), '0.5 * m * v^2');
});

// ==================== EVALUATION TESTS ====================

runner.test('evaluate: simple arithmetic', () => {
  const engine = new MathEngine();
  assertEqual(engine.evaluate('2 + 3'), 5);
  assertEqual(engine.evaluate('10 - 4'), 6);
  assertEqual(engine.evaluate('3 * 4'), 12);
  assertEqual(engine.evaluate('15 / 3'), 5);
});

runner.test('evaluate: with parentheses', () => {
  const engine = new MathEngine();
  assertEqual(engine.evaluate('(2 + 3) * 4'), 20);
});

runner.test('evaluate: with exponents', () => {
  const engine = new MathEngine();
  assertEqual(engine.evaluate('2^3'), 8);
  assertEqual(engine.evaluate('3^2'), 9);
});

runner.test('evaluate: with variables', () => {
  const engine = new MathEngine();
  engine.storeVariable('x', 5);
  assertEqual(engine.evaluate('x * 2'), 10);
  assertEqual(engine.evaluate('x^2'), 25);
});

runner.test('evaluate: with functions', () => {
  const engine = new MathEngine();
  assertApproximately(engine.evaluate('sin(0)'), 0);
  assertApproximately(engine.evaluate('cos(0)'), 1);
  assertApproximately(engine.evaluate('sqrt(16)'), 4);
});

runner.test('evaluate: invalid expression throws', () => {
  const engine = new MathEngine();
  assertThrows(() => engine.evaluate('2 + + 3'));
});

runner.test('evaluate: undefined variable throws', () => {
  const engine = new MathEngine();
  assertThrows(() => engine.evaluate('x + 5'));
});

// ==================== SOLVING TESTS ====================

runner.test('solve: simple expression', () => {
  const engine = new MathEngine();
  const result = engine.solve('2 + 3');
  assertTrue(result.success);
  assertEqual(result.result, 5);
  assertEqual(result.type, 'expression');
});

runner.test('solve: expression with question mark', () => {
  const engine = new MathEngine();
  const result = engine.solve('10 * 5 = ?');
  assertTrue(result.success);
  assertEqual(result.result, 50);
});

runner.test('solve: direct assignment', () => {
  const engine = new MathEngine();
  const result = engine.solve('x = 5');
  assertTrue(result.success);
  assertEqual(result.result, 5);
  assertEqual(result.variable, 'x');
  assertEqual(result.type, 'assignment');
  assertEqual(engine.getVariable('x'), 5);
});

runner.test('solve: assignment with expression', () => {
  const engine = new MathEngine();
  const result = engine.solve('y = 2 + 3');
  assertTrue(result.success);
  assertEqual(result.result, 5);
  assertEqual(engine.getVariable('y'), 5);
});

runner.test('solve: formula storage', () => {
  const engine = new MathEngine();
  const result = engine.solve('F = m * a');
  assertTrue(result.success);
  assertEqual(result.type, 'formula_storage');
  assertEqual(engine.getFormula('F'), 'm * a');
  assertDeepEqual(result.missingVariables.sort(), ['a', 'm']);
});

runner.test('solve: formula evaluation with known variables', () => {
  const engine = new MathEngine();
  engine.storeVariable('m', 5);
  engine.storeVariable('a', 10);
  const result = engine.solve('F = m * a');
  assertTrue(result.success);
  assertEqual(result.result, 50);
  assertEqual(result.type, 'formula_evaluation');
  assertEqual(engine.getVariable('F'), 50);
});

runner.test('solve: solve for unknown (linear)', () => {
  const engine = new MathEngine();
  engine.storeVariable('F', 50);
  engine.storeVariable('m', 5);
  const result = engine.solve('F = m * a');
  assertTrue(result.success);
  assertApproximately(result.result, 10);
  assertEqual(result.variable, 'a');
  assertApproximately(engine.getVariable('a'), 10);
});

runner.test('solve: solve for unknown (different order)', () => {
  const engine = new MathEngine();
  engine.storeVariable('F', 50);
  engine.storeVariable('a', 10);
  const result = engine.solve('F = m * a');
  assertTrue(result.success);
  assertApproximately(result.result, 5);
  assertEqual(result.variable, 'm');
});

runner.test('solve: verify equation (all variables known)', () => {
  const engine = new MathEngine();
  engine.storeVariable('F', 50);
  engine.storeVariable('m', 5);
  engine.storeVariable('a', 10);
  const result = engine.solve('F = m * a');
  assertTrue(result.success);
  assertTrue(result.verified);
  assertEqual(result.type, 'verification');
});

runner.test('solve: kinetic energy formula', () => {
  const engine = new MathEngine();
  engine.storeVariable('m', 10);
  engine.storeVariable('v', 20);
  const result = engine.solve('KE = 0.5 * m * v^2');
  assertTrue(result.success);
  assertEqual(result.result, 2000);
  assertEqual(engine.getVariable('KE'), 2000);
});

runner.test('solve: quadratic equation', () => {
  const engine = new MathEngine();
  engine.storeVariable('y', 0);
  const result = engine.solve('y = x^2 - 4');
  assertTrue(result.success);
  // Should find x = 2 or x = -2
  const x = engine.getVariable('x');
  assertApproximately(x * x, 4, 1e-6);
});

runner.test('solve: multiple unknowns should fail', () => {
  const engine = new MathEngine();
  const result = engine.solve('F = m * a');
  assertFalse(result.success);
  assertEqual(result.type, 'unsolvable');
  assertTrue(result.error.includes('multiple unknown'));
});

// ==================== STEP TRACKING TESTS ====================

runner.test('solve: tracks steps for assignment', () => {
  const engine = new MathEngine();
  const result = engine.solve('x = 5');
  assertTrue(result.steps.length > 0);
  assertTrue(result.steps.some(s => s.action === 'parse'));
  assertTrue(result.steps.some(s => s.action === 'assign'));
});

runner.test('solve: tracks steps for formula', () => {
  const engine = new MathEngine();
  const result = engine.solve('F = m * a');
  assertTrue(result.steps.some(s => s.action === 'formula_detected'));
  assertTrue(result.steps.some(s => s.action === 'formula_stored'));
});

// ==================== CLEAR/RESET TESTS ====================

runner.test('clearVariable: removes variable', () => {
  const engine = new MathEngine();
  engine.storeVariable('x', 5);
  assertEqual(engine.getVariable('x'), 5);
  engine.clearVariable('x');
  assertEqual(engine.getVariable('x'), undefined);
});

runner.test('clearAllVariables: removes all', () => {
  const engine = new MathEngine();
  engine.storeVariable('x', 5);
  engine.storeVariable('y', 10);
  engine.clearAllVariables();
  assertEqual(engine.getVariable('x'), undefined);
  assertEqual(engine.getVariable('y'), undefined);
});

runner.test('clearAllFormulas: removes all formulas', () => {
  const engine = new MathEngine();
  engine.storeFormula('F', 'm * a');
  engine.storeFormula('v', 'd / t');
  engine.clearAllFormulas();
  assertEqual(engine.getFormula('F'), undefined);
  assertEqual(engine.getFormula('v'), undefined);
});

runner.test('reset: clears everything', () => {
  const engine = new MathEngine();
  engine.storeVariable('x', 5);
  engine.storeFormula('F', 'm * a');
  engine.reset();
  assertEqual(engine.getVariable('x'), undefined);
  assertEqual(engine.getFormula('F'), undefined);
});

// ==================== EDGE CASES ====================

runner.test('edge case: division by zero', () => {
  const engine = new MathEngine();
  const result = engine.evaluate('1 / 0');
  assertEqual(result, Infinity);
});

runner.test('edge case: very small numbers', () => {
  const engine = new MathEngine();
  const result = engine.evaluate('1e-100 * 1e-100');
  assertTrue(result < 1e-150);
});

runner.test('edge case: very large numbers', () => {
  const engine = new MathEngine();
  const result = engine.evaluate('1e100 * 1e100');
  assertTrue(result > 1e150);
});

runner.test('edge case: negative numbers', () => {
  const engine = new MathEngine();
  assertEqual(engine.evaluate('-5 + 3'), -2);
  assertEqual(engine.evaluate('(-2)^2'), 4);
});

runner.test('edge case: decimal precision', () => {
  const engine = new MathEngine();
  assertApproximately(engine.evaluate('0.1 + 0.2'), 0.3, 1e-10);
});

runner.test('edge case: complex nested expressions', () => {
  const engine = new MathEngine();
  const result = engine.evaluate('((2 + 3) * (4 + 5)) / (1 + 2)');
  assertApproximately(result, 15);
});

runner.test('edge case: formula with same variable on both sides', () => {
  const engine = new MathEngine();
  engine.storeVariable('x', 5);
  const result = engine.solve('x = x + 1');
  // Should detect that x is both known and unknown
  assertTrue(result.success);
});

// ==================== REAL-WORLD SCENARIOS ====================

runner.test('scenario: physics - velocity calculation', () => {
  const engine = new MathEngine();
  engine.solve('d = 100'); // distance = 100m
  engine.solve('t = 5');   // time = 5s
  const result = engine.solve('v = d / t');
  assertTrue(result.success);
  assertEqual(result.result, 20); // velocity = 20 m/s
});

runner.test('scenario: physics - force calculation', () => {
  const engine = new MathEngine();
  engine.solve('m = 10'); // mass = 10kg
  engine.solve('a = 5');  // acceleration = 5 m/s²
  const result = engine.solve('F = m * a');
  assertTrue(result.success);
  assertEqual(result.result, 50); // force = 50N
});

runner.test('scenario: geometry - circle area', () => {
  const engine = new MathEngine();
  engine.solve('r = 5');
  const result = engine.solve('A = pi * r^2');
  assertTrue(result.success);
  assertApproximately(result.result, Math.PI * 25, 1e-10);
});

runner.test('scenario: compound calculation', () => {
  const engine = new MathEngine();
  engine.solve('x = 5');
  engine.solve('y = 10');
  engine.solve('z = x + y');
  assertEqual(engine.getVariable('z'), 15);
  const result = engine.solve('result = z * 2');
  assertEqual(result.result, 30);
});

runner.test('scenario: solving backwards', () => {
  const engine = new MathEngine();
  // We know the area and want to find the radius
  engine.solve('A = 78.54'); // approximately pi * 5^2
  const result = engine.solve('A = pi * r^2');
  assertTrue(result.success);
  assertApproximately(result.result, 5, 0.01);
});

// ==================== CALCULUS TESTS ====================

runner.test('calculus: symbolic derivative to string', () => {
  const engine = new MathEngine();
  const result = engine.evaluate('derivative(x^2, x)');
  // Should stringify to 2 * x
  assertEqual(String(result).replace(/\s+/g, ''), '2*x');
});

runner.test('calculus: derivative at a point', () => {
  const engine = new MathEngine();
  const val = engine.evaluate('diff(x^3, x, 2)'); // 3*x^2 at x=2 => 12
  assertApproximately(val, 12);
});

runner.test('calculus: definite integral numeric', () => {
  const engine = new MathEngine();
  const area = engine.evaluate('integrate(x^2, x, 0, 3)'); // => 9
  assertApproximately(area, 9, 1e-6);
});

runner.test('calculus: integrate with bounds as expressions', () => {
  const engine = new MathEngine();
  engine.storeVariable('a', 0);
  engine.storeVariable('b', Math.PI);
  const area = engine.evaluate('integrate(sin(x), x, a, b)'); // => 2
  assertApproximately(area, 2, 1e-6);
});

// Run all tests
if (typeof window === 'undefined') {
  // Node.js environment
  runner.run();
} else {
  // Browser environment
  runner.run();
}
