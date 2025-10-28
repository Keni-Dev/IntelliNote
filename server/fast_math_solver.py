"""
Fast Math Solver - Optimized for speed by keeping SymPy loaded in memory
Bypasses subprocess overhead and classifier when note_type is provided
"""

from sympy import *
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
from typing import Dict, Any, Optional

# Keep SymPy initialized
init_printing(use_latex=True)


class FastMathSolver:
    """
    Lightweight solver optimized for speed.
    Skips auto-detection when note_type is provided.
    """
    
    def solve_equation(self, equation: str, solve_for_var: Optional[str] = None) -> Dict[str, Any]:
        """
        Solve algebraic equation directly without classification
        
        Args:
            equation: The equation string (e.g., "x+3=0" or "x^{2}+3x+2=0")
            solve_for_var: Variable to solve for (optional, auto-detects if None)
        
        Returns:
            Dict with solutions formatted as "variable = value"
        """
        try:
            # Clean LaTeX formatting
            equation = self._clean_latex(equation)
            
            # Parse equation
            if '=' in equation:
                left, right = equation.split('=', 1)
                left_expr = self._parse(left.strip())
                right_expr = self._parse(right.strip())
                expr = Eq(left_expr, right_expr)
            else:
                expr = self._parse(equation)
            
            # Determine variable
            if solve_for_var:
                var = symbols(solve_for_var)
                solutions = solve(expr, var)
            else:
                # Auto-detect variable (fast)
                free_vars = list(expr.free_symbols)
                if len(free_vars) == 1:
                    var = free_vars[0]
                    solutions = solve(expr, var)
                    solve_for_var = str(var)
                else:
                    solutions = solve(expr)
            
            # Format solutions with variable name
            if isinstance(solutions, list):
                if solve_for_var:
                    solution_latex = [f"{solve_for_var} = {latex(sol)}" for sol in solutions]
                else:
                    solution_latex = [latex(sol) for sol in solutions]
            elif isinstance(solutions, dict):
                solution_latex = [f"{str(k)} = {latex(v)}" for k, v in solutions.items()]
            else:
                if solve_for_var:
                    solution_latex = [f"{solve_for_var} = {latex(solutions)}"]
                else:
                    solution_latex = [latex(solutions)]
            
            return {
                'success': True,
                'type': 'equation_solution',
                'solutions': solution_latex,
                'variable': solve_for_var,
                'original': equation
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'original': equation
            }
    
    def _parse(self, expr_str: str):
        """Parse mathematical expression"""
        try:
            transformations = standard_transformations + (implicit_multiplication_application,)
            return parse_expr(expr_str, transformations=transformations)
        except:
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


# Global instance to avoid re-initialization
_fast_solver = None


def get_fast_solver() -> FastMathSolver:
    """Get or create the global fast solver instance"""
    global _fast_solver
    if _fast_solver is None:
        _fast_solver = FastMathSolver()
    return _fast_solver


def fast_solve(equation: str, note_type: str = 'algebra') -> Dict[str, Any]:
    """
    Fast solving entry point - bypasses subprocess and classifier
    
    Args:
        equation: The equation to solve
        note_type: Type hint (currently only 'algebra' is fast-path)
    
    Returns:
        Solution dict with formatted output
    """
    solver = get_fast_solver()
    
    # For algebra, use direct solver
    if note_type in ['algebra', 'general', 'auto']:
        result = solver.solve_equation(equation)
        return {
            'success': result['success'],
            'classification': {
                'problem_type': note_type,
                'confidence': 1.0,
                'equation': equation
            },
            'result': result if result['success'] else None,
            'explanation': f"Solved equation for {result.get('variable', 'variable')}" if result['success'] else result.get('error'),
            'error': result.get('error')
        }
    
    # For other types, fall back to smart engine
    # (Could add fast-path for calculus, physics later)
    from smart_math_engine import SmartMathEngine
    engine = SmartMathEngine()
    return engine.process(equation, note_type)
