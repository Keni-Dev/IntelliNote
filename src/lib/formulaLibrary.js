/**
 * Formula Library - Collection of common mathematical, physics, and chemistry formulas
 * Each formula includes: name, expression, variables, category, and description
 */

/**
 * Formula structure:
 * - id: Unique identifier
 * - name: Display name
 * - expression: Mathematical expression (left side is the result)
 * - variables: Array of variable definitions
 * - category: Formula category (physics, math, chemistry, etc.)
 * - description: Brief description
 * - units: Optional unit information
 */

export const formulaLibrary = {
  // ==================== PHYSICS FORMULAS ====================
  
  // Kinematics
  velocity: {
    id: 'velocity',
    name: 'Velocity',
    expression: 'v = d / t',
    variables: [
      { symbol: 'v', name: 'velocity', unit: 'm/s' },
      { symbol: 'd', name: 'distance', unit: 'm' },
      { symbol: 't', name: 'time', unit: 's' }
    ],
    category: 'physics',
    subcategory: 'kinematics',
    description: 'Velocity equals distance divided by time'
  },

  acceleration: {
    id: 'acceleration',
    name: 'Acceleration',
    expression: 'a = (vf - vi) / t',
    variables: [
      { symbol: 'a', name: 'acceleration', unit: 'm/s²' },
      { symbol: 'vf', name: 'final velocity', unit: 'm/s' },
      { symbol: 'vi', name: 'initial velocity', unit: 'm/s' },
      { symbol: 't', name: 'time', unit: 's' }
    ],
    category: 'physics',
    subcategory: 'kinematics',
    description: 'Acceleration equals change in velocity over time'
  },

  distanceWithAcceleration: {
    id: 'distanceWithAcceleration',
    name: 'Distance with Constant Acceleration',
    expression: 'd = vi * t + 0.5 * a * t^2',
    variables: [
      { symbol: 'd', name: 'distance', unit: 'm' },
      { symbol: 'vi', name: 'initial velocity', unit: 'm/s' },
      { symbol: 't', name: 'time', unit: 's' },
      { symbol: 'a', name: 'acceleration', unit: 'm/s²' }
    ],
    category: 'physics',
    subcategory: 'kinematics',
    description: 'Distance traveled under constant acceleration'
  },

  // Dynamics
  newtonSecondLaw: {
    id: 'newtonSecondLaw',
    name: "Newton's Second Law",
    expression: 'F = m * a',
    variables: [
      { symbol: 'F', name: 'force', unit: 'N' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'a', name: 'acceleration', unit: 'm/s²' }
    ],
    category: 'physics',
    subcategory: 'dynamics',
    description: 'Force equals mass times acceleration'
  },

  weight: {
    id: 'weight',
    name: 'Weight',
    expression: 'W = m * g',
    variables: [
      { symbol: 'W', name: 'weight', unit: 'N' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'g', name: 'gravity', unit: 'm/s²', default: 9.8 }
    ],
    category: 'physics',
    subcategory: 'dynamics',
    description: 'Weight equals mass times gravitational acceleration'
  },

  momentum: {
    id: 'momentum',
    name: 'Momentum',
    expression: 'p = m * v',
    variables: [
      { symbol: 'p', name: 'momentum', unit: 'kg·m/s' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'v', name: 'velocity', unit: 'm/s' }
    ],
    category: 'physics',
    subcategory: 'dynamics',
    description: 'Momentum equals mass times velocity'
  },

  // Energy
  kineticEnergy: {
    id: 'kineticEnergy',
    name: 'Kinetic Energy',
    expression: 'KE = 0.5 * m * v^2',
    variables: [
      { symbol: 'KE', name: 'kinetic energy', unit: 'J' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'v', name: 'velocity', unit: 'm/s' }
    ],
    category: 'physics',
    subcategory: 'energy',
    description: 'Kinetic energy equals half mass times velocity squared'
  },

  potentialEnergy: {
    id: 'potentialEnergy',
    name: 'Gravitational Potential Energy',
    expression: 'PE = m * g * h',
    variables: [
      { symbol: 'PE', name: 'potential energy', unit: 'J' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'g', name: 'gravity', unit: 'm/s²', default: 9.8 },
      { symbol: 'h', name: 'height', unit: 'm' }
    ],
    category: 'physics',
    subcategory: 'energy',
    description: 'Potential energy equals mass times gravity times height'
  },

  work: {
    id: 'work',
    name: 'Work',
    expression: 'W = F * d',
    variables: [
      { symbol: 'W', name: 'work', unit: 'J' },
      { symbol: 'F', name: 'force', unit: 'N' },
      { symbol: 'd', name: 'distance', unit: 'm' }
    ],
    category: 'physics',
    subcategory: 'energy',
    description: 'Work equals force times distance'
  },

  power: {
    id: 'power',
    name: 'Power',
    expression: 'P = W / t',
    variables: [
      { symbol: 'P', name: 'power', unit: 'W' },
      { symbol: 'W', name: 'work', unit: 'J' },
      { symbol: 't', name: 'time', unit: 's' }
    ],
    category: 'physics',
    subcategory: 'energy',
    description: 'Power equals work divided by time'
  },

  einsteinMassEnergy: {
    id: 'einsteinMassEnergy',
    name: 'Mass-Energy Equivalence',
    expression: 'E = m * c^2',
    variables: [
      { symbol: 'E', name: 'energy', unit: 'J' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'c', name: 'speed of light', unit: 'm/s', default: 299792458 }
    ],
    category: 'physics',
    subcategory: 'relativity',
    description: "Einstein's mass-energy equivalence formula"
  },

  // Electricity
  ohmLaw: {
    id: 'ohmLaw',
    name: "Ohm's Law",
    expression: 'V = I * R',
    variables: [
      { symbol: 'V', name: 'voltage', unit: 'V' },
      { symbol: 'I', name: 'current', unit: 'A' },
      { symbol: 'R', name: 'resistance', unit: 'Ω' }
    ],
    category: 'physics',
    subcategory: 'electricity',
    description: 'Voltage equals current times resistance'
  },

  electricPower: {
    id: 'electricPower',
    name: 'Electric Power',
    expression: 'P = V * I',
    variables: [
      { symbol: 'P', name: 'power', unit: 'W' },
      { symbol: 'V', name: 'voltage', unit: 'V' },
      { symbol: 'I', name: 'current', unit: 'A' }
    ],
    category: 'physics',
    subcategory: 'electricity',
    description: 'Electric power equals voltage times current'
  },

  // Waves
  waveSpeed: {
    id: 'waveSpeed',
    name: 'Wave Speed',
    expression: 'v = f * lambda',
    variables: [
      { symbol: 'v', name: 'wave speed', unit: 'm/s' },
      { symbol: 'f', name: 'frequency', unit: 'Hz' },
      { symbol: 'lambda', name: 'wavelength', unit: 'm' }
    ],
    category: 'physics',
    subcategory: 'waves',
    description: 'Wave speed equals frequency times wavelength'
  },

  // ==================== MATHEMATICS FORMULAS ====================

  // Geometry - 2D Shapes
  rectangleArea: {
    id: 'rectangleArea',
    name: 'Rectangle Area',
    expression: 'A = l * w',
    variables: [
      { symbol: 'A', name: 'area', unit: 'm²' },
      { symbol: 'l', name: 'length', unit: 'm' },
      { symbol: 'w', name: 'width', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'Area of a rectangle equals length times width'
  },

  rectanglePerimeter: {
    id: 'rectanglePerimeter',
    name: 'Rectangle Perimeter',
    expression: 'P = 2 * (l + w)',
    variables: [
      { symbol: 'P', name: 'perimeter', unit: 'm' },
      { symbol: 'l', name: 'length', unit: 'm' },
      { symbol: 'w', name: 'width', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'Perimeter of a rectangle equals twice the sum of length and width'
  },

  circleArea: {
    id: 'circleArea',
    name: 'Circle Area',
    expression: 'A = pi * r^2',
    variables: [
      { symbol: 'A', name: 'area', unit: 'm²' },
      { symbol: 'r', name: 'radius', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'Area of a circle equals pi times radius squared'
  },

  circleCircumference: {
    id: 'circleCircumference',
    name: 'Circle Circumference',
    expression: 'C = 2 * pi * r',
    variables: [
      { symbol: 'C', name: 'circumference', unit: 'm' },
      { symbol: 'r', name: 'radius', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'Circumference of a circle equals 2 times pi times radius'
  },

  triangleArea: {
    id: 'triangleArea',
    name: 'Triangle Area',
    expression: 'A = 0.5 * b * h',
    variables: [
      { symbol: 'A', name: 'area', unit: 'm²' },
      { symbol: 'b', name: 'base', unit: 'm' },
      { symbol: 'h', name: 'height', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'Area of a triangle equals half base times height'
  },

  pythagoreanTheorem: {
    id: 'pythagoreanTheorem',
    name: 'Pythagorean Theorem',
    expression: 'c = sqrt(a^2 + b^2)',
    variables: [
      { symbol: 'c', name: 'hypotenuse', unit: 'm' },
      { symbol: 'a', name: 'side a', unit: 'm' },
      { symbol: 'b', name: 'side b', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'In a right triangle, the square of the hypotenuse equals the sum of squares of the other sides'
  },

  // Geometry - 3D Shapes
  sphereVolume: {
    id: 'sphereVolume',
    name: 'Sphere Volume',
    expression: 'V = (4/3) * pi * r^3',
    variables: [
      { symbol: 'V', name: 'volume', unit: 'm³' },
      { symbol: 'r', name: 'radius', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'Volume of a sphere equals four-thirds pi times radius cubed'
  },

  sphereSurfaceArea: {
    id: 'sphereSurfaceArea',
    name: 'Sphere Surface Area',
    expression: 'A = 4 * pi * r^2',
    variables: [
      { symbol: 'A', name: 'surface area', unit: 'm²' },
      { symbol: 'r', name: 'radius', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'Surface area of a sphere equals 4 times pi times radius squared'
  },

  cylinderVolume: {
    id: 'cylinderVolume',
    name: 'Cylinder Volume',
    expression: 'V = pi * r^2 * h',
    variables: [
      { symbol: 'V', name: 'volume', unit: 'm³' },
      { symbol: 'r', name: 'radius', unit: 'm' },
      { symbol: 'h', name: 'height', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'Volume of a cylinder equals pi times radius squared times height'
  },

  coneVolume: {
    id: 'coneVolume',
    name: 'Cone Volume',
    expression: 'V = (1/3) * pi * r^2 * h',
    variables: [
      { symbol: 'V', name: 'volume', unit: 'm³' },
      { symbol: 'r', name: 'radius', unit: 'm' },
      { symbol: 'h', name: 'height', unit: 'm' }
    ],
    category: 'math',
    subcategory: 'geometry',
    description: 'Volume of a cone equals one-third pi times radius squared times height'
  },

  // Algebra
  quadraticFormula: {
    id: 'quadraticFormula',
    name: 'Quadratic Formula',
    expression: 'x = (-b + sqrt(b^2 - 4*a*c)) / (2*a)',
    variables: [
      { symbol: 'x', name: 'solution' },
      { symbol: 'a', name: 'coefficient a' },
      { symbol: 'b', name: 'coefficient b' },
      { symbol: 'c', name: 'coefficient c' }
    ],
    category: 'math',
    subcategory: 'algebra',
    description: 'Solution to ax² + bx + c = 0 (positive root)'
  },

  slopeIntercept: {
    id: 'slopeIntercept',
    name: 'Slope-Intercept Form',
    expression: 'y = m * x + b',
    variables: [
      { symbol: 'y', name: 'y-coordinate' },
      { symbol: 'm', name: 'slope' },
      { symbol: 'x', name: 'x-coordinate' },
      { symbol: 'b', name: 'y-intercept' }
    ],
    category: 'math',
    subcategory: 'algebra',
    description: 'Linear equation in slope-intercept form'
  },

  // ==================== CHEMISTRY FORMULAS ====================

  idealGasLaw: {
    id: 'idealGasLaw',
    name: 'Ideal Gas Law',
    expression: 'P * V = n * R * T',
    variables: [
      { symbol: 'P', name: 'pressure', unit: 'Pa' },
      { symbol: 'V', name: 'volume', unit: 'm³' },
      { symbol: 'n', name: 'moles', unit: 'mol' },
      { symbol: 'R', name: 'gas constant', unit: 'J/(mol·K)', default: 8.314 },
      { symbol: 'T', name: 'temperature', unit: 'K' }
    ],
    category: 'chemistry',
    subcategory: 'gas laws',
    description: 'Ideal gas law relating pressure, volume, moles, and temperature'
  },

  density: {
    id: 'density',
    name: 'Density',
    expression: 'rho = m / V',
    variables: [
      { symbol: 'rho', name: 'density', unit: 'kg/m³' },
      { symbol: 'm', name: 'mass', unit: 'kg' },
      { symbol: 'V', name: 'volume', unit: 'm³' }
    ],
    category: 'chemistry',
    subcategory: 'properties',
    description: 'Density equals mass divided by volume'
  },

  molarity: {
    id: 'molarity',
    name: 'Molarity',
    expression: 'M = n / V',
    variables: [
      { symbol: 'M', name: 'molarity', unit: 'mol/L' },
      { symbol: 'n', name: 'moles', unit: 'mol' },
      { symbol: 'V', name: 'volume', unit: 'L' }
    ],
    category: 'chemistry',
    subcategory: 'solutions',
    description: 'Molarity equals moles of solute divided by liters of solution'
  },

  molesFromMass: {
    id: 'molesFromMass',
    name: 'Moles from Mass',
    expression: 'n = m / M',
    variables: [
      { symbol: 'n', name: 'moles', unit: 'mol' },
      { symbol: 'm', name: 'mass', unit: 'g' },
      { symbol: 'M', name: 'molar mass', unit: 'g/mol' }
    ],
    category: 'chemistry',
    subcategory: 'stoichiometry',
    description: 'Moles equals mass divided by molar mass'
  }
};

/**
 * Get formulas by category
 * @param {string} category - Category name (physics, math, chemistry)
 * @returns {Array} - Array of formulas in that category
 */
export function getFormulasByCategory(category) {
  return Object.values(formulaLibrary).filter(
    formula => formula.category === category
  );
}

/**
 * Get formulas by subcategory
 * @param {string} subcategory - Subcategory name
 * @returns {Array} - Array of formulas in that subcategory
 */
export function getFormulasBySubcategory(subcategory) {
  return Object.values(formulaLibrary).filter(
    formula => formula.subcategory === subcategory
  );
}

/**
 * Search formulas by name or description
 * @param {string} query - Search query
 * @returns {Array} - Array of matching formulas
 */
export function searchFormulas(query) {
  const lowerQuery = query.toLowerCase();
  return Object.values(formulaLibrary).filter(formula =>
    formula.name.toLowerCase().includes(lowerQuery) ||
    formula.description.toLowerCase().includes(lowerQuery) ||
    formula.variables.some(v => v.name.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all categories
 * @returns {Array} - Array of unique category names
 */
export function getAllCategories() {
  return [...new Set(Object.values(formulaLibrary).map(f => f.category))];
}

/**
 * Get all subcategories for a category
 * @param {string} category - Category name
 * @returns {Array} - Array of unique subcategory names
 */
export function getSubcategories(category) {
  return [...new Set(
    Object.values(formulaLibrary)
      .filter(f => f.category === category)
      .map(f => f.subcategory)
  )];
}

/**
 * Get formula by ID
 * @param {string} id - Formula ID
 * @returns {Object|null} - Formula object or null if not found
 */
export function getFormulaById(id) {
  return formulaLibrary[id] || null;
}

/**
 * Get all formulas as array
 * @returns {Array} - Array of all formulas
 */
export function getAllFormulas() {
  return Object.values(formulaLibrary);
}
