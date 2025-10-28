"""
Equation Classifier - Automatically detect the type of mathematical problem
"""

import re
from typing import Dict, List, Optional, Tuple


class EquationClassifier:
    """
    Automatically classify mathematical equations and determine the appropriate solving strategy
    """
    
    def __init__(self):
        self.patterns = {
            'calculus_derivative': [
                r'd[xy]/d[xy]',
                r'\\frac\{d',
                r'derivative',
                r"f'",
                r'\\partial',
                r'\bd/d[a-z]\b'
            ],
            'calculus_integral': [
                r'\\int',
                r'integral',
                r'∫',
                r'area under',
                r'\bintegrate\b'
            ],
            'calculus_limit': [
                r'\\lim',
                r'limit',
                r'approaches',
                r'as.*→',
                r'tends to'
            ],
            'physics_kinematics': [
                r'\bv\s*=\s*u\s*\+\s*a\s*\*?\s*t\b',
                r'\bs\s*=\s*u\s*\*?\s*t\s*\+',
                r'\bv\s*\*\*?\s*2\s*=\s*u\s*\*\*?\s*2',
                r'velocity|acceleration|displacement'
            ],
            'physics_force': [
                r'\bF\s*=\s*m\s*\*?\s*a\b',
                r'force|newton|mass.*acceleration'
            ],
            'physics_energy': [
                r'\bE\s*=\s*m\s*\*?\s*c\s*\*\*?\s*2',
                r'KE\s*=|PE\s*=',
                r'kinetic|potential.*energy'
            ],
            'physics_electricity': [
                r'\bV\s*=\s*I\s*\*?\s*R\b',
                r'\bP\s*=\s*V\s*\*?\s*I\b',
                r'voltage|current|resistance|ohm'
            ],
            'statistics': [
                r'mean|average|median|mode',
                r'variance|std|standard deviation',
                r'probability|P\(',
                r'normal distribution|gaussian'
            ],
            'linear_algebra': [
                r'matrix|determinant|eigenvalue',
                r'\\begin\{matrix\}',
                r'dot product|cross product',
                r'vector'
            ],
            'trigonometry': [
                r'\bsin\b|\bcos\b|\btan\b|\bcot\b|\bsec\b|\bcsc\b',
                r'\\sin|\\cos|\\tan',
                r'triangle|angle'
            ],
            'algebra': [
                r'solve|find|calculate',
                r'=.*[a-z]',  # equations with variables
            ]
        }
        
        self.operation_keywords = {
            'solve': ['solve', 'find', 'what is', 'calculate', 'determine', '='],
            'simplify': ['simplify', 'reduce', 'expand'],
            'factor': ['factor', 'factorize', 'factorise'],
            'differentiate': ['derivative', 'differentiate', "f'", 'd/d', 'rate of change'],
            'integrate': ['integrate', 'integral', 'antiderivative', 'area'],
            'limit': ['limit', 'approaches', 'tends to'],
            'plot': ['plot', 'graph', 'draw', 'sketch']
        }

    def classify(self, input_text: str) -> Dict:
        """
        Automatically classify the type of mathematical problem
        Returns: dict with problem_type, operation, and extracted info
        """
        input_lower = input_text.lower()
        
        # Detect problem type
        problem_type = self._detect_problem_type(input_text, input_lower)
        
        # Detect operation
        operation = self._detect_operation(input_lower)
        
        # Extract variables (basic regex-based extraction)
        variables = self._extract_variables_simple(input_text)
        
        # Detect what to solve for
        solve_for = self._detect_solve_for(input_text, variables)
        
        # Extract equation
        equation = self._extract_equation(input_text)
        
        # Detect if definite or indefinite (for integrals)
        limits = self._extract_limits(input_text)
        
        return {
            'problem_type': problem_type,
            'operation': operation,
            'equation': equation,
            'variables': variables,
            'solve_for': solve_for,
            'limits': limits,
            'confidence': self._calculate_confidence(problem_type, operation)
        }

    def _detect_problem_type(self, text: str, text_lower: str) -> str:
        """Detect the category of mathematical problem"""
        scores = {}
        
        for prob_type, patterns in self.patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    score += 1
            if score > 0:
                scores[prob_type] = score
        
        if scores:
            return max(scores, key=scores.get)
        return 'algebra'  # default

    def _detect_operation(self, text_lower: str) -> str:
        """Detect what operation to perform"""
        for operation, keywords in self.operation_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return operation
        return 'solve'  # default

    def _extract_variables_simple(self, text: str) -> List[str]:
        """Extract mathematical variables from text using regex"""
        # Find single letters that might be variables (excluding common words)
        variables = re.findall(r'\b([a-zA-Z])\b', text)
        
        # Filter out common words and duplicates
        excluded = {'a', 'i', 'A', 'I', 'e', 'E'}
        variables = [v for v in variables if v not in excluded]
        
        return list(set(variables))

    def _detect_solve_for(self, text: str, variables: List[str]) -> Optional[str]:
        """Detect which variable to solve for"""
        # Check for explicit "solve for x" pattern
        match = re.search(r'solve for\s+([a-zA-Z])', text, re.IGNORECASE)
        if match:
            return match.group(1)
        
        # Check for "find x" pattern
        match = re.search(r'find\s+([a-zA-Z])', text, re.IGNORECASE)
        if match:
            return match.group(1)
        
        # Check for "what is x" pattern
        match = re.search(r'what is\s+([a-zA-Z])', text, re.IGNORECASE)
        if match:
            return match.group(1)
        
        # Default to 'x' if it exists, otherwise first variable
        if 'x' in variables:
            return 'x'
        elif variables:
            return variables[0]
        
        return None

    def _extract_equation(self, text: str) -> str:
        """Extract the mathematical equation from text"""
        # Remove common question words
        equation = re.sub(r'(solve|find|calculate|what is|determine)\s+', '', text, flags=re.IGNORECASE)
        equation = re.sub(r'(for|the value of)\s+[a-zA-Z]\s*', '', equation, flags=re.IGNORECASE)
        equation = equation.strip()
        
        return equation

    def _extract_limits(self, text: str) -> Optional[Tuple[float, float]]:
        """Extract integration limits or boundary conditions"""
        # Pattern for "from a to b" or "between a and b"
        match = re.search(r'(?:from|between)\s+([-\d.]+)\s+(?:to|and)\s+([-\d.]+)', text)
        if match:
            return (float(match.group(1)), float(match.group(2)))
        
        # Pattern for limits in bracket format [a, b]
        match = re.search(r'\[([^,]+),\s*([^\]]+)\]', text)
        if match:
            try:
                return (float(match.group(1)), float(match.group(2)))
            except ValueError:
                pass
        
        return None

    def _calculate_confidence(self, problem_type: str, operation: str) -> float:
        """Calculate confidence score for classification"""
        # Simple confidence based on whether we detected specific patterns
        if problem_type != 'algebra' and operation != 'solve':
            return 0.9
        elif problem_type != 'algebra':
            return 0.7
        elif operation != 'solve':
            return 0.6
        else:
            return 0.5
