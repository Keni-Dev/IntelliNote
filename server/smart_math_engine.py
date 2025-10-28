"""
Smart Math Engine - Intelligent mathematical solver using SymPy
Automatically classifies and solves complex equations in calculus, physics, statistics, etc.
"""

import re
from sympy import *
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
import json
import sys
from typing import Dict, Any, Optional, List
from equation_classifier import EquationClassifier


class SmartMathEngine:
    """
    Advanced mathematical engine that automatically detects and solves various types of equations
    """
    
    def __init__(self):
        self._classifier = None  # Lazy load classifier
        init_printing(use_latex=True)
        
        # Common constants
        self.constants = {
            'g': 9.81,  # gravitational acceleration (m/s²)
            'c': 299792458,  # speed of light (m/s)
            'h': 6.62607015e-34,  # Planck constant (J⋅s)
            'k': 1.380649e-23,  # Boltzmann constant (J/K)
            'G': 6.67430e-11,  # Gravitational constant
            'e_charge': 1.602176634e-19,  # Elementary charge (C)
            'R': 8.314462618,  # Gas constant (J/(mol⋅K))
            'Na': 6.02214076e23  # Avogadro constant (1/mol)
        }
    
    @property
    def classifier(self):
        """Lazy load classifier only when auto-detection is needed"""
        if self._classifier is None:
            self._classifier = EquationClassifier()
        return self._classifier
    
    def process(self, user_input: str, note_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Automatically process any math problem
        
        Args:
            user_input: The equation or mathematical expression
            note_type: Optional hint about the type ('algebra', 'calculus', 'physics', etc.)
        
        Returns:
            Dict with classification, result, and explanation
        """
        try:
            # FAST PATH: Skip classification if note_type is provided
            if note_type and note_type != 'auto':
                # Create minimal classification without expensive pattern matching
                classification = {
                    'problem_type': note_type,
                    'confidence': 1.0,
                    'equation': user_input,
                    'operation': 'solve',
                    'solve_for': None,
                    'limits': None
                }
            else:
                # SLOW PATH: Auto-detect (only when needed)
                classification = self.classifier.classify(user_input)
            
            # Route to appropriate solver
            result = self._route_to_solver(classification)
            
            return {
                'success': True,
                'classification': classification,
                'result': result,
                'explanation': self._generate_explanation(classification, result)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'classification': None,
                'result': None,
                'explanation': f'Failed to process: {str(e)}'
            }
    
    def _route_to_solver(self, classification: Dict) -> Dict[str, Any]:
        """Route to the appropriate solving method"""
        problem_type = classification['problem_type']
        operation = classification['operation']
        equation = classification['equation']
        
        try:
            # Parse the equation
            if operation == 'differentiate' or 'derivative' in problem_type:
                return self._solve_derivative(equation, classification)
            
            elif operation == 'integrate' or 'integral' in problem_type:
                return self._solve_integral(equation, classification)
            
            elif operation == 'limit' or 'limit' in problem_type:
                return self._solve_limit(equation, classification)
            
            elif 'physics' in problem_type:
                return self._solve_physics(equation, classification)
            
            elif 'statistics' in problem_type:
                return self._solve_statistics(equation, classification)
            
            elif operation == 'simplify':
                expr = self._parse_expression(equation)
                simplified = simplify(expr)
                return {
                    'type': 'simplification',
                    'original': latex(expr),
                    'result': latex(simplified),
                    'steps': [
                        f'Original: {latex(expr)}',
                        f'Simplified: {latex(simplified)}'
                    ]
                }
            
            elif operation == 'factor':
                expr = self._parse_expression(equation)
                factored = factor(expr)
                return {
                    'type': 'factorization',
                    'original': latex(expr),
                    'result': latex(factored),
                    'steps': [
                        f'Original: {latex(expr)}',
                        f'Factored: {latex(factored)}'
                    ]
                }
            
            else:  # Default: solve equation
                return self._solve_equation(equation, classification)
        
        except Exception as e:
            return {
                'type': 'error',
                'error': str(e),
                'original_input': equation
            }
    
    def _parse_expression(self, expr_str: str):
        """Parse mathematical expression with intelligent transformations"""
        # Clean up LaTeX formatting
        expr_str = self._clean_latex(expr_str)
        
        try:
            # Try standard SymPy parsing first
            transformations = standard_transformations + (implicit_multiplication_application,)
            return parse_expr(expr_str, transformations=transformations)
        except:
            # Fallback to sympify
            return sympify(expr_str)
    
    def _clean_latex(self, text: str) -> str:
        """
        Convert common LaTeX syntax to SymPy-compatible format
        Examples:
            x^{2} -> x^2
            3x -> 3*x
            \\frac{a}{b} -> a/b
            \\sqrt{x} -> sqrt(x)
        """
        import re
        
        # Remove LaTeX braces from exponents: x^{2} -> x^2
        text = re.sub(r'\^{([^}]+)}', r'^\1', text)
        
        # Convert \frac{a}{b} to (a)/(b)
        text = re.sub(r'\\frac{([^}]+)}{([^}]+)}', r'(\1)/(\2)', text)
        
        # Convert \sqrt{x} to sqrt(x)
        text = re.sub(r'\\sqrt{([^}]+)}', r'sqrt(\1)', text)
        
        # Convert \cdot to *
        text = text.replace(r'\cdot', '*')
        
        # Convert \times to *
        text = text.replace(r'\times', '*')
        
        # Remove \left and \right
        text = text.replace(r'\left', '')
        text = text.replace(r'\right', '')
        
        # Add explicit multiplication: 3x -> 3*x, 2y -> 2*y
        # Match: digit followed by letter
        text = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', text)
        
        # Add multiplication between )(  -> )*(
        text = re.sub(r'\)\s*\(', ')*(', text)
        
        # Remove extra spaces
        text = ' '.join(text.split())
        
        return text
    
    def _solve_equation(self, equation: str, classification: Dict) -> Dict[str, Any]:
        """Solve algebraic equation"""
        try:
            solve_for = classification['solve_for']
            
            # Check if equation has '='
            if '=' in equation:
                left, right = equation.split('=', 1)
                left_expr = self._parse_expression(left.strip())
                right_expr = self._parse_expression(right.strip())
                expr = Eq(left_expr, right_expr)
            else:
                expr = self._parse_expression(equation)
            
            if solve_for:
                var = symbols(solve_for)
                solutions = solve(expr, var)
            else:
                # Auto-detect variable
                free_vars = list(expr.free_symbols)
                if len(free_vars) == 1:
                    var = free_vars[0]
                    solutions = solve(expr, var)
                    solve_for = str(var)
                else:
                    solutions = solve(expr)
            
            # Format solutions with variable name
            if isinstance(solutions, list):
                if solve_for:
                    # Format as "x = value" for each solution
                    solution_latex = [f"{solve_for} = {latex(sol)}" for sol in solutions]
                else:
                    solution_latex = [latex(sol) for sol in solutions]
            elif isinstance(solutions, dict):
                # Format dict solutions as "var = value"
                solution_latex = [f"{str(k)} = {latex(v)}" for k, v in solutions.items()]
            else:
                if solve_for:
                    solution_latex = [f"{solve_for} = {latex(solutions)}"]
                else:
                    solution_latex = [latex(solutions)]
            
            return {
                'type': 'equation_solution',
                'original': equation,
                'solutions': solution_latex,
                'variable': solve_for,
                'steps': [
                    f'Equation: {equation}',
                    f'Solving for: {solve_for}' if solve_for else 'Auto-detecting variable',
                    f'Solution(s): {", ".join(solution_latex)}'
                ]
            }
        except Exception as e:
            raise Exception(f'Failed to solve equation: {str(e)}')
    
    def _solve_derivative(self, equation: str, classification: Dict) -> Dict[str, Any]:
        """Calculate derivative"""
        try:
            # Extract the expression (remove derivative notation if present)
            expr_str = re.sub(r'd/d[a-z]\s*\(?(.+?)\)?', r'\1', equation)
            expr_str = expr_str.replace('derivative of', '').strip()
            
            expr = self._parse_expression(expr_str)
            var = symbols(classification['solve_for'] or 'x')
            
            # Calculate derivative
            derivative = diff(expr, var)
            
            return {
                'type': 'derivative',
                'original': latex(expr),
                'result': latex(derivative),
                'variable': str(var),
                'steps': [
                    f'Function: f({var}) = {latex(expr)}',
                    f'Derivative: f\'({var}) = {latex(derivative)}'
                ]
            }
        except Exception as e:
            raise Exception(f'Failed to calculate derivative: {str(e)}')
    
    def _solve_integral(self, equation: str, classification: Dict) -> Dict[str, Any]:
        """Calculate integral"""
        try:
            # Extract the expression (remove integral notation if present)
            expr_str = re.sub(r'∫|integral|integrate', '', equation).strip()
            
            expr = self._parse_expression(expr_str)
            var = symbols(classification['solve_for'] or 'x')
            limits = classification['limits']
            
            if limits:
                # Definite integral
                result = integrate(expr, (var, limits[0], limits[1]))
                integral_type = 'definite'
                steps = [
                    f'Function: f({var}) = {latex(expr)}',
                    f'Limits: [{limits[0]}, {limits[1]}]',
                    f'Definite Integral: {latex(result)}'
                ]
            else:
                # Indefinite integral
                result = integrate(expr, var)
                integral_type = 'indefinite'
                steps = [
                    f'Function: f({var}) = {latex(expr)}',
                    f'Indefinite Integral: {latex(result)} + C'
                ]
            
            return {
                'type': f'{integral_type}_integral',
                'original': latex(expr),
                'result': latex(result),
                'variable': str(var),
                'integral_type': integral_type,
                'steps': steps
            }
        except Exception as e:
            raise Exception(f'Failed to calculate integral: {str(e)}')
    
    def _solve_limit(self, equation: str, classification: Dict) -> Dict[str, Any]:
        """Calculate limit"""
        try:
            # Extract expression and point
            expr_str = re.sub(r'lim|limit', '', equation).strip()
            
            # Try to extract the point (e.g., "as x->0" or "x approaches 0")
            point_match = re.search(r'(?:as|x)\s*(?:->|approaches|→)\s*([-+]?\d*\.?\d+|inf|infinity)', equation, re.IGNORECASE)
            
            if point_match:
                point_str = point_match.group(1)
                if 'inf' in point_str.lower():
                    point = oo  # Infinity
                else:
                    point = float(point_str)
                # Remove the limit notation from expression
                expr_str = re.sub(r'(?:as|x)\s*(?:->|approaches|→)\s*[-+]?\d*\.?\d+', '', expr_str).strip()
            else:
                point = 0  # Default
            
            expr = self._parse_expression(expr_str)
            var = symbols(classification['solve_for'] or 'x')
            
            result = limit(expr, var, point)
            
            return {
                'type': 'limit',
                'original': latex(expr),
                'result': latex(result),
                'variable': str(var),
                'point': str(point),
                'steps': [
                    f'Function: f({var}) = {latex(expr)}',
                    f'Limit as {var} → {point}',
                    f'Result: {latex(result)}'
                ]
            }
        except Exception as e:
            raise Exception(f'Failed to calculate limit: {str(e)}')
    
    def _solve_physics(self, equation: str, classification: Dict) -> Dict[str, Any]:
        """Solve physics equation"""
        try:
            solve_for_var = classification['solve_for']
            
            # Parse equation
            if '=' in equation:
                left, right = equation.split('=', 1)
                left_expr = self._parse_expression(left.strip())
                right_expr = self._parse_expression(right.strip())
                expr = Eq(left_expr, right_expr)
            else:
                expr = self._parse_expression(equation)
            
            if solve_for_var:
                var = symbols(solve_for_var)
                solutions = solve(expr, var)
            else:
                # Auto-detect
                free_vars = list(expr.free_symbols)
                if len(free_vars) > 0:
                    var = free_vars[0]
                    solutions = solve(expr, var)
                    solve_for_var = str(var)
                else:
                    solutions = solve(expr)
            
            # Format solutions with variable name
            if isinstance(solutions, list):
                if solve_for_var:
                    # Format as "x = value" for each solution
                    solution_latex = [f"{solve_for_var} = {latex(sol)}" for sol in solutions]
                else:
                    solution_latex = [latex(sol) for sol in solutions]
            else:
                if solve_for_var:
                    solution_latex = [f"{solve_for_var} = {latex(solutions)}"]
                else:
                    solution_latex = [latex(solutions)]
            
            return {
                'type': 'physics_solution',
                'original': equation,
                'solutions': solution_latex,
                'variable': solve_for_var,
                'steps': [
                    f'Physics equation: {equation}',
                    f'Solving for: {solve_for_var}',
                    f'Solution(s): {", ".join(solution_latex)}'
                ]
            }
        except Exception as e:
            raise Exception(f'Failed to solve physics equation: {str(e)}')
    
    def _solve_statistics(self, equation: str, classification: Dict) -> Dict[str, Any]:
        """Handle statistics problems"""
        # Placeholder for statistics - would need more sophisticated parsing
        return {
            'type': 'statistics',
            'message': 'Statistics solving requires structured data input',
            'original': equation,
            'steps': ['Statistics operations require additional context']
        }
    
    def _generate_explanation(self, classification: Dict, result: Dict) -> str:
        """Generate human-readable explanation"""
        if not result or result.get('type') == 'error':
            return f"Error: {result.get('error', 'Unknown error')}"
        
        result_type = result.get('type', 'unknown')
        
        explanations = {
            'equation_solution': f"Solved equation for {classification.get('solve_for', 'variable')}",
            'derivative': f"Calculated derivative with respect to {result.get('variable', 'x')}",
            'definite_integral': "Calculated definite integral",
            'indefinite_integral': "Calculated indefinite integral (antiderivative)",
            'limit': f"Calculated limit as {result.get('variable', 'x')} approaches {result.get('point', '0')}",
            'physics_solution': f"Solved physics equation for {result.get('variable', 'unknown')}",
            'simplification': "Simplified expression",
            'factorization': "Factored expression"
        }
        
        return explanations.get(result_type, "Processed mathematical expression")


def main():
    """Main entry point for command-line usage"""
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        engine = SmartMathEngine()
        
        user_input = input_data.get('input', '')
        note_type = input_data.get('note_type', None)
        
        result = engine.process(user_input, note_type)
        
        print(json.dumps(result, indent=2))
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'classification': None,
            'result': None
        }
        print(json.dumps(error_result, indent=2))


if __name__ == '__main__':
    main()
