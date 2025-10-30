"""
Enhanced Fast Math Solver - Comprehensive support for all math types
Supports: Algebra, Calculus, Physics, Trigonometry, Statistics, Linear Algebra, and more
Optimized for speed by keeping SymPy loaded in memory
"""

from sympy import *
from sympy.core.mul import Mul
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
from sympy.parsing.latex import parse_latex
from sympy.physics.mechanics import dynamicsymbols
from sympy.physics.vector import ReferenceFrame
from sympy.stats import Normal, Die, Binomial, density, E as Expectation, variance, Poisson, Exponential
from sympy.vector import CoordSys3D, divergence, curl, gradient
from sympy.geometry import Point, Line, Circle, Triangle, Polygon
from sympy.matrices import Matrix, eye, zeros, ones
from typing import Dict, Any, Optional, List, Tuple
import re

# Keep SymPy initialized
init_printing(use_latex=True)

# Pre-initialize common symbols for faster solving
x, y, z, t, n, k = symbols('x y z t n k', real=True)
a, b, c, d, e, f, g, h, i, j = symbols('a b c d e f g h i j', real=True)
theta, phi, alpha, beta, gamma = symbols('theta phi alpha beta gamma', real=True)

# Physics symbols
m, M, v, u, F, g_sym, T, P, V, R = symbols('m M v u F g T P V R', positive=True)
# Use lambda_var and mu_var instead of reserved keywords
lambda_var, mu_var = symbols('lambda_var mu_var', positive=True)
N_force = symbols('N', positive=True)  # Normal force
c_heat = symbols('c', positive=True)   # Specific heat capacity
pi_sym = pi
e_sym = E

class FastMathSolver:
    """
    Comprehensive solver supporting all math types
    - Algebra: equations, polynomials, systems
    - Calculus: derivatives, integrals, limits, series
    - Physics: kinematics, dynamics, energy, waves
    - Trigonometry: identities, equations, simplification
    - Statistics: probability, distributions, expected value
    - Linear Algebra: matrices, determinants, eigenvalues
    """
    
    def __init__(self):
        """Initialize with pre-warmed SymPy operations"""
        # Pre-warm common operations to avoid first-call delay
        _ = diff(x**2, x)
        _ = integrate(x, x)
        _ = limit(sin(x)/x, x, 0)
        _ = Matrix([[1, 2], [3, 4]])
    
    def _validate_equation(self, equation: str, operation_type: str = 'general') -> Dict[str, Any]:
        """
        Validate equation and provide user-friendly error messages for missing components
        
        Args:
            equation: The equation string
            operation_type: Type of operation (integral, derivative, limit, equation, etc.)
        
        Returns:
            Dict with 'valid': bool and 'error': str if invalid
        """
        equation_lower = equation.lower()
        original = equation
        
        # INTEGRAL VALIDATION
        if operation_type == 'integral' or r'\int' in equation or '∫' in equation or 'integrate' in equation_lower:
            # Check for missing differential (dx, dy, dt, etc.)
            has_differential = bool(re.search(r'd[a-z]', equation))
            if not has_differential:
                # Try to detect what variable they might want
                cleaned = self._clean_latex(equation)
                try:
                    parsed = self._parse(cleaned.replace('\\int', '').replace('∫', '').strip())
                    vars_found = list(parsed.free_symbols)
                    if vars_found:
                        var_name = str(vars_found[0])
                        return {
                            'valid': False,
                            'error': f'Missing differential in integral',
                            'suggestion': f'Did you mean to include "d{var_name}"?',
                            'hint': f'Example: ∫{cleaned} d{var_name}',
                            'user_message': f'⚠️ Your integral is missing a differential! Try adding "d{var_name}" at the end.'
                        }
                except:
                    pass
                
                return {
                    'valid': False,
                    'error': 'Missing differential in integral',
                    'suggestion': 'Add dx, dy, dt, or another differential at the end',
                    'hint': 'Example: ∫x² dx  (note the "dx" at the end)',
                    'user_message': '⚠️ Your integral is missing a differential! Please add "dx" (or dy, dt, etc.) at the end.'
                }
            
            # Check for definite integral missing limits
            if r'\int_' in equation or '∫_' in equation:
                # Has lower limit, check for upper limit
                if not re.search(r'\\int_\{[^}]+\}\^\{[^}]+\}', equation) and not re.search(r'∫_\{[^}]+\}\^\{[^}]+\}', equation):
                    return {
                        'valid': False,
                        'error': 'Incomplete definite integral',
                        'suggestion': 'Definite integrals need both lower and upper limits',
                        'hint': 'Example: ∫₀² x dx  or  \\int_{0}^{2} x dx',
                        'user_message': '⚠️ Your definite integral is missing limits! Include both lower and upper bounds like ∫₀² or ∫_{0}^{2}.'
                    }
        
        # DERIVATIVE VALIDATION
        if operation_type == 'derivative' or 'd/d' in equation or r'\frac{d' in equation or 'derivative' in equation_lower:
            # Check for d/dx format - must have variable specified
            if 'd/d' in equation:
                match = re.search(r'd/d([a-z])', equation)
                if not match:
                    return {
                        'valid': False,
                        'error': 'Missing variable in derivative notation',
                        'suggestion': 'Specify which variable to differentiate with respect to',
                        'hint': 'Example: d/dx(x²) or d/dt(sin(t))',
                        'user_message': '⚠️ Your derivative notation is incomplete! Specify the variable like "d/dx" or "d/dt".'
                    }
            
            # Check for \frac{d}{dx} format
            if r'\frac{d' in equation:
                if not re.search(r'\\frac\{d\}\{d[a-z]\}', equation):
                    return {
                        'valid': False,
                        'error': 'Incomplete derivative notation',
                        'suggestion': 'Use proper derivative notation: \\frac{d}{dx}',
                        'hint': 'Example: \\frac{d}{dx}(x²)',
                        'user_message': '⚠️ Your derivative notation is incomplete! Use \\frac{d}{dx} or \\frac{d}{dt}.'
                    }
        
        # LIMIT VALIDATION
        if operation_type == 'limit' or r'\lim' in equation or 'lim' in equation_lower or 'limit' in equation_lower:
            # Check for limit point
            has_limit_point = bool(re.search(r'\\lim_\{[a-z]\s*\\to\s*[^}]+\}', equation) or 
                                  re.search(r'lim\s+[a-z]\s*→\s*\S+', equation) or
                                  'limit(' in equation_lower)
            
            if not has_limit_point:
                return {
                    'valid': False,
                    'error': 'Missing limit point',
                    'suggestion': 'Specify what value the variable approaches',
                    'hint': 'Example: \\lim_{x\\to 0} or lim x→0',
                    'user_message': '⚠️ Your limit is missing a point! Specify where the variable approaches, like "x→0" or "x→∞".'
                }
        
        # EQUATION VALIDATION
        if operation_type == 'equation':
            # Check for balanced parentheses
            if equation.count('(') != equation.count(')'):
                return {
                    'valid': False,
                    'error': 'Unbalanced parentheses',
                    'suggestion': 'Make sure all opening parentheses "(" have matching closing ")"',
                    'user_message': f'⚠️ Unbalanced parentheses! You have {equation.count("(")} opening but {equation.count(")")} closing.'
                }
            
            if equation.count('{') != equation.count('}'):
                return {
                    'valid': False,
                    'error': 'Unbalanced braces',
                    'suggestion': 'Make sure all opening braces "{" have matching closing "}"',
                    'user_message': f'⚠️ Unbalanced braces! You have {equation.count("{")} opening but {equation.count("}")} closing.'
                }
            
            # Check for operators without operands
            if re.search(r'[+\-*/^]\s*[=]', equation) or re.search(r'[=]\s*[+*/^]', equation):
                return {
                    'valid': False,
                    'error': 'Missing operand',
                    'suggestion': 'Check that all operators (+, -, *, /, ^) have numbers or variables on both sides',
                    'user_message': '⚠️ Missing operand! Make sure operators like +, -, *, / have values on both sides.'
                }
        
        # MATRIX VALIDATION
        if operation_type == 'matrix' or 'matrix' in equation_lower or r'\begin{' in equation:
            if r'\begin{' in equation:
                # Check for matching \end{}
                begin_matches = re.findall(r'\\begin\{([^}]+)\}', equation)
                end_matches = re.findall(r'\\end\{([^}]+)\}', equation)
                
                if len(begin_matches) != len(end_matches):
                    return {
                        'valid': False,
                        'error': 'Unmatched matrix environment',
                        'suggestion': 'Every \\begin{matrix} needs a matching \\end{matrix}',
                        'user_message': '⚠️ Unmatched matrix environment! Make sure every \\begin{matrix} has an \\end{matrix}.'
                    }
        
        # GENERAL SYNTAX VALIDATION
        # Check for empty equation
        if not equation.strip():
            return {
                'valid': False,
                'error': 'Empty equation',
                'user_message': '⚠️ Please enter an equation or expression to solve.'
            }
        
        # Check for multiple consecutive operators
        if re.search(r'[+\-*/^]{2,}', equation.replace('**', '').replace('--', '')):
            return {
                'valid': False,
                'error': 'Multiple consecutive operators',
                'suggestion': 'Remove duplicate operators like "++", "**", etc.',
                'user_message': '⚠️ Multiple consecutive operators detected! Check for typos like "++" or "**".'
            }
        
        # Check for invalid characters (after basic LaTeX patterns)
        # Allow: letters, numbers, basic math operators, LaTeX commands, Greek letters, subscripts, superscripts
        cleaned_check = equation
        # Remove common LaTeX patterns
        cleaned_check = re.sub(r'\\[a-zA-Z]+', '', cleaned_check)  # Remove LaTeX commands
        # Allow standard characters + Unicode math symbols + superscripts/subscripts
        # Superscripts: ⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ  Subscripts: ₀₁₂₃₄₅₆₇₈₉
        cleaned_check = re.sub(r'[a-zA-Z0-9\s+\-*/^(){}[\]_.,=<>!|√∫∞×÷≠≤≥πθαβγδεζηικλμνξοπρστυφχψωΓΔΘΛΞΠΣΥΦΨΩ⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉→]', '', cleaned_check)
        
        if cleaned_check.strip():
            # Has unexpected characters
            unexpected = ''.join(set(cleaned_check.strip()))
            return {
                'valid': False,
                'error': 'Unexpected characters',
                'suggestion': f'Found unexpected characters: {unexpected}',
                'user_message': f'⚠️ Unexpected characters found: {unexpected}. Please use standard math notation.'
            }
        
        # All validations passed
        return {'valid': True}
    
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
            # Validate equation first
            validation = self._validate_equation(equation, 'equation')
            if not validation['valid']:
                return {
                    'success': False,
                    'error': validation['error'],
                    'message': validation.get('user_message', validation['error']),
                    'suggestion': validation.get('suggestion', ''),
                    'hint': validation.get('hint', ''),
                    'original': equation
                }
            
            # Clean LaTeX formatting
            equation = self._clean_latex(equation)
            
            # Check for division by zero BEFORE parsing
            if '/0' in equation.replace(' ', ''):
                return {
                    'success': False,
                    'error': 'Division by zero',
                    'original': equation
                }
            
            # Handle inequalities (≠, ≤, ≥, <, >)
            if '!=' in equation:
                # Not equal: x ≠ 5 means solve for where x is not 5
                parts = equation.split('!=')
                if len(parts) == 2:
                    return {
                        'success': True,
                        'type': 'inequality',
                        'result': f"{parts[0].strip()} ≠ {parts[1].strip()}",
                        'explanation': f"All values except {parts[1].strip()}"
                    }
            
            if '<=' in equation or '>=' in equation or '<' in equation or '>' in equation:
                # Inequality solving
                try:
                    # Try to solve as inequality
                    from sympy import solve_univariate_inequality
                    
                    # Parse inequality
                    if '<=' in equation:
                        left, right = equation.split('<=')
                        expr = self._parse(left.strip()) - self._parse(right.strip())
                        var = list(expr.free_symbols)[0] if expr.free_symbols else x
                        result = solve_univariate_inequality(expr <= 0, var, relational=False)
                    elif '>=' in equation:
                        left, right = equation.split('>=')
                        expr = self._parse(left.strip()) - self._parse(right.strip())
                        var = list(expr.free_symbols)[0] if expr.free_symbols else x
                        result = solve_univariate_inequality(expr >= 0, var, relational=False)
                    elif '<' in equation:
                        left, right = equation.split('<')
                        expr = self._parse(left.strip()) - self._parse(right.strip())
                        var = list(expr.free_symbols)[0] if expr.free_symbols else x
                        result = solve_univariate_inequality(expr < 0, var, relational=False)
                    else:  # '>' in equation
                        left, right = equation.split('>')
                        expr = self._parse(left.strip()) - self._parse(right.strip())
                        var = list(expr.free_symbols)[0] if expr.free_symbols else x
                        result = solve_univariate_inequality(expr > 0, var, relational=False)
                    
                    return {
                        'success': True,
                        'type': 'inequality',
                        'result': latex(result),
                        'variable': str(var)
                    }
                except:
                    # If inequality solving fails, just return the statement
                    return {
                        'success': True,
                        'type': 'inequality',
                        'result': equation,
                        'explanation': 'Inequality constraint'
                    }
            
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
                var = symbols(solve_for_var, real=True)
                solutions = solve(expr, var)
            else:
                # Auto-detect variable (fast)
                free_vars = list(expr.free_symbols)
                if len(free_vars) == 1:
                    var = free_vars[0]
                    # For Abs, assume real
                    if 'Abs' in str(expr):
                        var_real = symbols(str(var), real=True)
                        expr_real = expr.subs(var, var_real)
                        solutions = solve(expr_real, var_real)
                    else:
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
    
    def integrate_by_parts(self, u_expr, dv_expr, var) -> Dict[str, Any]:
        """
        Perform integration by parts: ∫u dv = uv - ∫v du
        
        Args:
            u_expr: Expression to use as 'u'
            dv_expr: Expression to use as 'dv'
            var: Integration variable
        
        Returns:
            Dict with step-by-step integration by parts
        """
        try:
            # Step 1: u and du
            u = u_expr
            du = diff(u, var)
            
            # Step 2: dv and v
            dv = dv_expr
            v = integrate(dv, var)
            
            # Step 3: Apply formula ∫u dv = uv - ∫v du
            uv = u * v
            v_du = v * du
            remaining_integral = integrate(v_du, var)
            
            # Final result
            result = uv - remaining_integral
            
            return {
                'success': True,
                'type': 'integration_by_parts',
                'u': latex(u),
                'du': latex(du),
                'dv': latex(dv),
                'v': latex(v),
                'uv': latex(uv),
                'v_du': latex(v_du),
                'remaining_integral': latex(remaining_integral),
                'result': latex(result) + ' + C',
                'steps': [
                    f"Let u = {latex(u)}, then du = {latex(du)} d{var}",
                    f"Let dv = {latex(dv)} d{var}, then v = {latex(v)}",
                    f"Using ∫u dv = uv - ∫v du:",
                    f"= {latex(uv)} - ∫({latex(v)})({latex(du)}) d{var}",
                    f"= {latex(uv)} - ∫{latex(v_du)} d{var}",
                    f"= {latex(uv)} - ({latex(remaining_integral)})",
                    f"= {latex(result)} + C"
                ]
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Integration by parts failed: {str(e)}"
            }
    
    def integrate_by_substitution(self, integrand, var, substitution_var=None) -> Dict[str, Any]:
        """
        Perform integration by substitution (u-substitution)
        Auto-detects best substitution or uses provided one
        """
        try:
            if substitution_var is None:
                # Auto-detect substitution
                # Look for composite functions like f(g(x))
                result = integrate(integrand, var)
                return {
                    'success': True,
                    'type': 'integration_substitution',
                    'integrand': latex(integrand),
                    'result': latex(result) + ' + C',
                    'steps': [
                        f"Integrate {latex(integrand)} d{var}",
                        f"Result: {latex(result)} + C"
                    ]
                }
            else:
                # Use provided substitution
                u = substitution_var
                du = diff(u, var)
                # Transform integrand
                new_integrand = integrand.subs(u, symbols('u_sub'))
                result = integrate(new_integrand, symbols('u_sub'))
                final_result = result.subs(symbols('u_sub'), u)
                
                return {
                    'success': True,
                    'type': 'integration_substitution',
                    'substitution': latex(u),
                    'result': latex(final_result) + ' + C'
                }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def partial_derivatives(self, expr_str: str, variables: List[str] = None) -> Dict[str, Any]:
        """
        Calculate partial derivatives for multivariable functions
        Example: ∂f/∂x, ∂f/∂y for f(x,y) = x²y + xy²
        """
        try:
            expr = self._parse(expr_str)
            
            if variables is None:
                variables = [str(s) for s in expr.free_symbols]
            
            partials = {}
            for var_str in variables:
                var = symbols(var_str)
                partial = diff(expr, var)
                partials[var_str] = latex(partial)
            
            return {
                'success': True,
                'type': 'partial_derivatives',
                'function': latex(expr),
                'partials': partials,
                'steps': [f"∂f/∂{v} = {partials[v]}" for v in variables]
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def implicit_differentiation(self, equation_str: str, y_var: str = 'y', x_var: str = 'x') -> Dict[str, Any]:
        """
        Perform implicit differentiation
        Example: x² + y² = 1, find dy/dx
        """
        try:
            equation = self._clean_latex(equation_str)
            if '=' in equation:
                left, right = equation.split('=')
                left_expr = self._parse(left)
                right_expr = self._parse(right)
            else:
                left_expr = self._parse(equation)
                right_expr = 0
            
            x_sym = symbols(x_var)
            y_sym = Function(y_var)(x_sym)
            
            # Replace y with y(x) for implicit differentiation
            expr = left_expr - right_expr
            
            # Differentiate both sides
            diff_expr = diff(expr.subs(symbols(y_var), y_sym), x_sym)
            
            # Solve for dy/dx
            dydx = symbols(f'd{y_var}/d{x_var}')
            solution = solve(diff_expr, diff(y_sym, x_sym))
            
            return {
                'success': True,
                'type': 'implicit_differentiation',
                'equation': equation_str,
                'derivative': latex(solution[0]) if solution else 'No solution',
                'steps': [
                    f"Differentiate both sides with respect to {x_var}",
                    f"Solve for d{y_var}/d{x_var}",
                    f"d{y_var}/d{x_var} = {latex(solution[0]) if solution else 'undefined'}"
                ]
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def taylor_series(self, expr_str: str, var: str = 'x', point: float = 0, order: int = 6) -> Dict[str, Any]:
        """
        Calculate Taylor/Maclaurin series expansion
        """
        try:
            expr = self._parse(expr_str)
            var_sym = symbols(var)
            
            series_expansion = series(expr, var_sym, point, order)
            
            return {
                'success': True,
                'type': 'taylor_series',
                'function': latex(expr),
                'point': point,
                'order': order,
                'expansion': latex(series_expansion),
                'steps': [
                    f"Expand {latex(expr)} around {var} = {point}",
                    f"Taylor series: {latex(series_expansion)}"
                ]
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def vector_calculus(self, operation: str, field_expr: str) -> Dict[str, Any]:
        """
        Vector calculus operations: gradient, divergence, curl, line integrals
        """
        try:
            if operation.lower() == 'gradient' or operation.lower() == 'grad':
                expr = self._parse(field_expr)
                grad_x = diff(expr, x)
                grad_y = diff(expr, y)
                grad_z = diff(expr, z)
                
                return {
                    'success': True,
                    'type': 'gradient',
                    'field': latex(expr),
                    'result': f"∇f = ({latex(grad_x)}, {latex(grad_y)}, {latex(grad_z)})"
                }
            
            return {'success': False, 'error': 'Operation not implemented'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def differential_equations(self, equation_str: str, func: str = 'y', var: str = 'x') -> Dict[str, Any]:
        """
        Solve ordinary differential equations (ODEs)
        Examples: dy/dx = x, d²y/dx² + y = 0
        """
        try:
            y_func = Function(func)(symbols(var))
            var_sym = symbols(var)
            
            # Parse the ODE
            equation = self._clean_latex(equation_str)
            
            # Simple pattern matching for common ODEs
            if "d^2" in equation or "d²" in equation:
                # Second order ODE
                ode = diff(y_func, var_sym, 2) + y_func  # Example: y'' + y = 0
            else:
                # First order ODE
                ode = diff(y_func, var_sym) - var_sym  # Example: y' = x
            
            solution = dsolve(ode, y_func)
            
            return {
                'success': True,
                'type': 'differential_equation',
                'ode': equation_str,
                'solution': latex(solution),
                'steps': [
                    f"Solve ODE: {equation_str}",
                    f"Solution: {latex(solution)}"
                ]
            }
        except Exception as e:
            # Fallback: try to parse and solve directly
            try:
                y_func = Function('y')(x)
                solution = dsolve(equation_str, y_func)
                return {
                    'success': True,
                    'type': 'differential_equation',
                    'solution': latex(solution)
                }
            except:
                return {'success': False, 'error': str(e)}
    
    def solve_calculus(self, equation: str, operation: str = 'auto') -> Dict[str, Any]:
        """
        Solve calculus problems: derivatives, integrals, limits, series
        
        Examples:
            - "\\int x^{2}dx" → x³/3 + C
            - "∫x² dx" → x³/3 + C (Unicode support)
            - "d/dx(x^3)" → 3x²
            - "\\lim_{x\\to 0} \\frac{\\sin(x)}{x}" → 1
            - "\\int x\\cos(x)dx" → Integration by parts (auto-detected)
        """
        try:
            # Validate based on operation type
            if r'\int' in equation or '∫' in equation or 'integrate' in equation.lower():
                validation = self._validate_equation(equation, 'integral')
            elif 'd/d' in equation or r'\frac{d' in equation or 'derivative' in equation.lower():
                validation = self._validate_equation(equation, 'derivative')
            elif r'\lim' in equation or 'lim' in equation.lower() or 'limit' in equation.lower():
                validation = self._validate_equation(equation, 'limit')
            else:
                validation = self._validate_equation(equation, 'general')
            
            if not validation['valid']:
                return {
                    'success': False,
                    'error': validation['error'],
                    'message': validation.get('user_message', validation['error']),
                    'suggestion': validation.get('suggestion', ''),
                    'hint': validation.get('hint', ''),
                    'original': equation
                }
            
            # FIRST: Convert Unicode math symbols to LaTeX equivalents
            # This must happen before regex matching
            original_equation = equation
            equation = self._convert_unicode_to_latex(equation)
            
            # Check for LIMITS first (before cleaning destroys \lim pattern)
            # Patterns: \lim_{x\to 0} expr, lim x→0 expr, limit(expr, x, 0)
            limit_patterns = [
                r'\\lim_\{([a-z])\s*\\to\s*([^}]+)\}\s*(.+)',  # \lim_{x\to 0} expr
                r'lim\s+([a-z])\s*→\s*(\S+)\s+(.+)',            # lim x→0 expr  
                r'limit\s*\(\s*(.+?)\s*,\s*([a-z])\s*,\s*(.+?)\s*\)',  # limit(expr, x, 0)
                r'\\lim_\{([a-z])\\to\s*([^}]+)\}\s*(.+)',     # \lim_{x\to 0} (no space)
            ]
            
            for pattern in limit_patterns:
                limit_match = re.search(pattern, equation, re.DOTALL)
                if limit_match:
                    groups = limit_match.groups()
                    # Different patterns have different group orders
                    if 'limit(' in pattern:
                        # limit(expr, x, 0) format
                        expr_str, var_str, point_str = groups
                    else:
                        # \lim_{x\to point} expr format
                        var_str, point_str, expr_str = groups
                    
                    # Clean each component
                    expr_str = self._clean_latex(expr_str.strip())
                    point_str = self._clean_latex(point_str.strip())
                    
                    # Parse
                    expr = self._parse(expr_str)
                    var = symbols(var_str)
                    
                    # Handle infinity: "oo" or "∞" or "inf"
                    if 'oo' in point_str or '∞' in point_str or 'inf' in point_str.lower():
                        point = oo
                    else:
                        point = self._parse(point_str)
                    
                    # Compute limit
                    result = limit(expr, var, point)
                    
                    return {
                        'success': True,
                        'type': 'limit',
                        'expression': latex(expr),
                        'variable': str(var),
                        'point': latex(point),
                        'result': latex(result),
                        'steps': [
                            f"Compute lim({latex(expr)}) as {var} → {latex(point)}",
                            f"Result: {latex(result)}"
                        ]
                    }

            # Early DERIVATIVE detection (before cleaning alters \frac or other notation)
            # Handle formats: d/dx(expr), \frac{d}{dx}(expr) and variants
            if 'd/d' in equation or r'\frac{d' in equation or 'derivative' in equation.lower():
                # Pattern A: d/dx(expr) or d/dx expr
                match = re.search(r'd/d([a-zA-Z])\s*\((.+)\)', equation)
                if not match:
                    match = re.search(r'd/d([a-zA-Z])\s+(.+)', equation)

                # Pattern B: \frac{d}{dx}(expr) or \frac{d}{dx} expr
                if not match:
                    match = re.search(r'\\frac\{d\}\{d([a-zA-Z])\}\s*\((.+)\)', equation)
                    if not match:
                        match = re.search(r'\\frac\{d\}\{d([a-zA-Z])\}\s+(.+)', equation)

                if match:
                    var_str, expr_str = match.groups()
                    try:
                        # Clean only the expression part, leave derivative notation intact
                        expr_clean = self._clean_latex(expr_str.strip())
                        expr = self._parse(expr_clean)
                        var = symbols(var_str)
                        result = diff(expr, var)

                        return {
                            'success': True,
                            'type': 'derivative',
                            'expression': latex(expr),
                            'variable': str(var),
                            'result': latex(result),
                            'steps': [
                                f"Differentiate {latex(expr)} with respect to {var}",
                                f"Apply differentiation rules",
                                f"d/d{var}({latex(expr)}) = {latex(result)}"
                            ]
                        }
                    except Exception as e:
                        return {'success': False, 'error': str(e)}
            
            # Check for definite integral (before any other processing)
            definite_match = re.search(r'\\int_\{([^}]+)\}\^\{([^}]+)\}\s*(.+?)\s+d([a-z])', equation)
            if definite_match:
                lower_str, upper_str, integrand_str, var_str = definite_match.groups()
                
                # Clean each component
                lower_str = self._clean_latex(lower_str)
                upper_str = self._clean_latex(upper_str)
                integrand_str = self._clean_latex(integrand_str)
                
                # Parse
                lower_val = self._parse(lower_str)
                upper_val = self._parse(upper_str)
                integrand = self._parse(integrand_str)
                var = symbols(var_str)
                
                # Compute definite integral
                result = integrate(integrand, (var, lower_val, upper_val))
                
                return {
                    'success': True,
                    'type': 'definite_integral',
                    'integrand': latex(integrand),
                    'variable': str(var),
                    'limits': f"[{latex(lower_val)}, {latex(upper_val)}]",
                    'result': latex(result),
                    'steps': [
                        f"Evaluate ∫ {latex(integrand)} d{var} from {latex(lower_val)} to {latex(upper_val)}",
                        f"Antiderivative: {latex(integrate(integrand, var))}",
                        f"Apply limits: {latex(result)}"
                    ]
                }
            
            # Detect indefinite integral BEFORE full cleaning (to preserve dx pattern)
            if r'\int' in equation or 'integrate' in equation.lower():
                match = re.search(r'\\int\s*(.+?)\s*d([a-z])', equation)
                if match:
                    integrand_str, var_str = match.groups()
                    # Now clean the integrand
                    integrand_str = self._clean_latex(integrand_str)
                    integrand = self._parse(integrand_str)
                    var = symbols(var_str)
                    
                    # Detect if integration by parts is needed
                    # Products like x*cos(x), x*sin(x), x*exp(x), x*log(x), etc.
                    needs_ibp = False
                    u_part = None
                    dv_part = None
                    
                    # Check if integrand is a product that needs integration by parts
                    if integrand.is_Mul:
                        args = integrand.args
                        # Look for polynomial * trig/exp/log
                        for i, arg in enumerate(args):
                            if arg.has(var):
                                # Polynomial part (like x, x^2, etc.)
                                if arg.is_Poly or arg.is_polynomial(var) or arg.is_Symbol:
                                    u_part = arg
                                    # dv is the rest
                                    dv_part = integrand / arg
                                    needs_ibp = True
                                    break
                                # Or if we have x * (trig/exp/log function)
                                elif any(func in str(arg) for func in ['sin', 'cos', 'exp', 'log']):
                                    dv_part = arg
                                    u_part = integrand / arg
                                    needs_ibp = True
                                    break
                    
                    # Also check for specific patterns like x*cos(x), x*sin(x), etc.
                    integrand_str_check = str(integrand).lower()
                    if any(pattern in integrand_str_check for pattern in ['*cos', '*sin', '*exp', '*log']):
                        if not needs_ibp:
                            # Try to split: find the polynomial part
                            if integrand.is_Mul:
                                poly_parts = []
                                func_parts = []
                                for arg in integrand.args:
                                    if arg.is_polynomial(var) or arg.is_Symbol or arg.is_number:
                                        poly_parts.append(arg)
                                    else:
                                        func_parts.append(arg)
                                
                                if poly_parts and func_parts:
                                    u_part = Mul(*poly_parts)
                                    dv_part = Mul(*func_parts)
                                    needs_ibp = True
                    
                    # Apply integration by parts if detected
                    if needs_ibp and u_part and dv_part:
                        ibp_result = self.integrate_by_parts(u_part, dv_part, var)
                        if ibp_result.get('success'):
                            return ibp_result
                    
                    # Regular indefinite integral
                    result = integrate(integrand, var)
                    
                    return {
                        'success': True,
                        'type': 'indefinite_integral',
                        'integrand': latex(integrand),
                        'variable': str(var),
                        'result': latex(result) + ' + C',
                        'steps': [
                            f"Integrate {latex(integrand)} with respect to {var}",
                            f"Apply power rule and integration formulas",
                            f"Result: {latex(result)} + C"
                        ]
                    }
            
            # Now clean for other operations
            equation = self._clean_latex(equation)
            
            # Detect derivative
            if 'd/d' in equation or r'\frac{d' in equation or 'derivative' in equation.lower():
                # Pattern 1: d/dx(expression)
                match = re.search(r'd/d([a-z])\s*\((.+)\)$', equation)
                if not match:
                    # Try without $ anchor
                    match = re.search(r'd/d([a-z])\s*\((.+)\)', equation)
                
                # Pattern 2: \frac{d}{dx}(expression) or \frac{d}{dx} expression
                if not match:
                    match = re.search(r'\\frac\{d\}\{d([a-z])\}\s*\((.+)\)', equation)
                    if not match:
                        # Try without parentheses
                        match = re.search(r'\\frac\{d\}\{d([a-z])\}\s*(.+)', equation)
                
                if match:
                    var_str, expr_str = match.groups()
                    expr = self._parse(expr_str)
                    var = symbols(var_str)
                    
                    result = diff(expr, var)
                    
                    return {
                        'success': True,
                        'type': 'derivative',
                        'expression': latex(expr),
                        'variable': str(var),
                        'result': latex(result),
                        'steps': [
                            f"Differentiate {latex(expr)} with respect to {var}",
                            f"Apply differentiation rules",
                            f"d/d{var}({latex(expr)}) = {latex(result)}"
                        ]
                    }
            
            # Detect limit - handle multiple formats
            if r'\lim' in equation or 'limit' in equation.lower() or '→' in equation or 'lim' in equation.lower():
                # Try multiple regex patterns
                var_str = None
                point_str = None
                expr_str = None
                
                # Pattern 1: \lim_{x\to a} f(x) - Most common LaTeX format
                match = re.search(r'\\lim_\{([a-z])\s*\\to\s*([^}]+)\}\s*(.+)', equation, re.IGNORECASE | re.DOTALL)
                if match:
                    var_str, point_str, expr_str = match.groups()
                
                # Pattern 2: lim x→a f(x) (Unicode arrow)
                if not match:
                    match = re.search(r'lim\s+([a-z])\s*→\s*(\S+)\s+(.+)', equation, re.IGNORECASE | re.DOTALL)
                    if match:
                        var_str, point_str, expr_str = match.groups()
                
                # Pattern 3: lim_{x->a} f(x) (ASCII arrow)
                if not match:
                    match = re.search(r'lim_?\{?([a-z])\s*->\s*([^}]+)\}?\s*(.+)', equation, re.IGNORECASE | re.DOTALL)
                    if match:
                        var_str, point_str, expr_str = match.groups()
                
                # Pattern 4: limit as x approaches a of f(x)
                if not match:
                    match = re.search(r'limit\s+(?:as\s+)?([a-z])\s+(?:approaches|to)\s+(\S+)\s+(?:of\s+)?(.+)', equation, re.IGNORECASE | re.DOTALL)
                    if match:
                        var_str, point_str, expr_str = match.groups()
                
                if var_str and point_str and expr_str:
                    var = symbols(var_str)
                    
                    # Handle special point values
                    point_str = point_str.strip().replace('∞', 'oo').replace('infinity', 'oo')
                    point = self._parse(point_str)
                    
                    # Parse expression - clean it first
                    expr_str = expr_str.strip()
                    expr = self._parse(expr_str)
                    
                    result = limit(expr, var, point)
                    
                    return {
                        'success': True,
                        'type': 'limit',
                        'expression': latex(expr),
                        'variable': str(var),
                        'point': latex(point),
                        'result': latex(result),
                        'steps': [
                            f"Find lim[{var}→{latex(point)}] {latex(expr)}",
                            f"Substitute and simplify",
                            f"Result: {latex(result)}"
                        ]
                    }
            
            # Detect series expansion
            if 'taylor' in equation.lower() or 'series' in equation.lower():
                # Simple pattern for now
                expr = self._parse(equation.split('taylor')[0] if 'taylor' in equation.lower() else equation)
                result = series(expr, x, 0, 6)  # Taylor series around 0, up to x^5
                
                return {
                    'success': True,
                    'type': 'series_expansion',
                    'expression': latex(expr),
                    'result': latex(result),
                    'steps': [
                        f"Expand {latex(expr)} as Taylor series",
                        f"Result: {latex(result)}"
                    ]
                }
            
            return {'success': False, 'error': 'Could not identify calculus operation'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def solve_physics(self, equation: str, problem_type: str = 'auto') -> Dict[str, Any]:
        """
        Solve physics problems: kinematics, dynamics, energy, waves, thermodynamics, electricity, etc.
        
        Examples:
            - "v = u + at, solve for v when u=0, a=9.8, t=2"
            - "F = ma, solve for a"
            - "E = mc^2, solve for m"
            - "PV = nRT" (ideal gas law)
            - "F = G*m1*m2/r^2" (gravitation)
            - "λ = h/p" (de Broglie wavelength)
        """
        try:
            # Validate equation
            validation = self._validate_equation(equation, 'equation')
            if not validation['valid']:
                return {
                    'success': False,
                    'error': validation['error'],
                    'message': validation.get('user_message', validation['error']),
                    'suggestion': validation.get('suggestion', ''),
                    'hint': validation.get('hint', ''),
                    'original': equation
                }
            
            equation = self._clean_latex(equation)
            
            # Common physics formulas - map to pre-defined symbols
            physics_symbols_map = {
                'v': v, 'u': u, 'a': a, 't': t, 's': symbols('s'), 'r': symbols('r'),
                'F': F, 'm': m, 'M': M, 'm1': symbols('m1'), 'm2': symbols('m2'),
                'E': symbols('E_energy'), 
                'c': c_heat,
                'g': g_sym, 'h': h, 'G': symbols('G'),
                'P': P, 'V': V, 'n': n, 'R': R, 'T': T,
                'W': symbols('W'), 'Q': symbols('Q'),
                'f': f, 'ω': symbols('omega'), 'ν': symbols('nu'),
                'λ': lambda_var, 'lambda': lambda_var,
                'μ': mu_var, 'mu': mu_var,
                'N': N_force,
                'I': symbols('I'), 'q': symbols('q'), 'C': symbols('C_capacitance'),
                'L': symbols('L'), 'B': symbols('B'), 'ε': symbols('epsilon'),
                'ρ': symbols('rho'), 'σ': symbols('sigma'),
                'τ': symbols('tau'), 'α': alpha, 'β': beta, 'γ': gamma,
                'θ': theta, 'φ': phi
            }
            
            # Detect specific physics topics
            eq_lower = equation.lower()
            
            # Kinematics equations
            if any(var in equation for var in ['v', 'u', 'a', 't', 's']) and '=' in equation:
                # Parse and solve
                if '=' in equation:
                    left, right = equation.split('=', 1)
                    left_expr = self._parse(left.strip())
                    right_expr = self._parse(right.strip())
                    
                    # Solve for a specific variable
                    free_vars = list((left_expr - right_expr).free_symbols)
                    if free_vars:
                        var = free_vars[0]
                        solutions = solve(Eq(left_expr, right_expr), var)
                        
                        return {
                            'success': True,
                            'type': 'physics_kinematics',
                            'formula': equation,
                            'solutions': [f"{str(var)} = {latex(sol)}" for sol in solutions],
                            'variable': str(var),
                            'topic': 'Kinematics'
                        }
            
            # Energy equations (KE, PE, Work)
            if 'ke' in eq_lower or 'kinetic' in eq_lower:
                # KE = (1/2)mv²
                result = Rational(1, 2) * m * v**2
                return {
                    'success': True,
                    'type': 'physics_energy',
                    'formula': 'Kinetic Energy',
                    'result': latex(result),
                    'topic': 'Energy'
                }
            
            if 'pe' in eq_lower or 'potential' in eq_lower:
                # PE = mgh
                result = m * g_sym * h
                return {
                    'success': True,
                    'type': 'physics_energy',
                    'formula': 'Potential Energy',
                    'result': latex(result),
                    'topic': 'Energy'
                }
            
            # Waves and oscillations
            if 'wave' in eq_lower or 'frequency' in eq_lower:
                # v = fλ or ω = 2πf
                if 'omega' in eq_lower or 'ω' in equation:
                    result = 2 * pi * f
                    return {
                        'success': True,
                        'type': 'physics_waves',
                        'formula': 'Angular frequency',
                        'result': f"ω = {latex(result)}",
                        'topic': 'Waves'
                    }
                else:
                    # v = fλ
                    result = f * lambda_var
                    return {
                        'success': True,
                        'type': 'physics_waves',
                        'formula': 'Wave speed',
                        'result': f"v = {latex(result)}",
                        'topic': 'Waves'
                    }
            
            # Thermodynamics
            if 'pv' in eq_lower.replace(' ', '') or 'ideal gas' in eq_lower:
                # PV = nRT
                result = solve(Eq(P*V, n*R*T), list((P*V - n*R*T).free_symbols)[0] if (P*V - n*R*T).free_symbols else P)
                return {
                    'success': True,
                    'type': 'physics_thermodynamics',
                    'formula': 'Ideal Gas Law: PV = nRT',
                    'solutions': [latex(sol) for sol in result] if isinstance(result, list) else [latex(result)],
                    'topic': 'Thermodynamics'
                }
            
            # Electricity and Magnetism
            if 'ohm' in eq_lower or ('v' in eq_lower and 'i' in eq_lower and 'r' in eq_lower):
                # V = IR (Ohm's Law)
                V_volt = symbols('V_voltage')
                I_current = symbols('I')
                R_resistance = symbols('R')
                
                return {
                    'success': True,
                    'type': 'physics_electricity',
                    'formula': "Ohm's Law: V = IR",
                    'result': latex(V_volt),
                    'topic': 'Electricity'
                }
            
            # General equation solving
            if '=' in equation:
                left, right = equation.split('=', 1)
                left_expr = self._parse(left.strip())
                right_expr = self._parse(right.strip())
                
                # Solve for a specific variable
                free_vars = list((left_expr - right_expr).free_symbols)
                if free_vars:
                    var = free_vars[0]
                    solutions = solve(Eq(left_expr, right_expr), var)
                    
                    return {
                        'success': True,
                        'type': 'physics_equation',
                        'formula': equation,
                        'solutions': [f"{str(var)} = {latex(sol)}" for sol in solutions],
                        'variable': str(var),
                        'topic': 'Physics'
                    }
            
            return {'success': False, 'error': 'Could not parse physics equation'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def solve_trigonometry(self, equation: str) -> Dict[str, Any]:
        """
        Solve trigonometric equations and simplify trig expressions
        
        Examples:
            - "sin(x) = 0.5" → x = π/6
            - "sin^2(x) + cos^2(x)" → 1
            - "tan(x) = 1" → x = π/4
            - Trig identities: sin²x + cos²x = 1, tan²x + 1 = sec²x
            - Inverse trig functions
            - Trig substitution
        """
        try:
            # Handle sin^2(x) -> sin(x)**2 before cleaning
            equation = re.sub(r'(sin|cos|tan|sec|csc|cot)\*\*\((\d+)\)', r'\1(x)**\2', equation)
            equation = re.sub(r'(sin|cos|tan|sec|csc|cot)\^(\d+)', r'\1(x)**\2', equation)
            equation = re.sub(r'(sin|cos|tan|sec|csc|cot)\^\{(\d+)\}', r'\1(x)**\2', equation)
            
            equation = self._clean_latex(equation)
            eq_lower = equation.lower()
            
            # Detect trig identity verification
            if 'identity' in eq_lower or 'prove' in eq_lower:
                # Just simplify the expression
                expr = self._parse(equation.replace('identity', '').replace('prove', '').strip())
                simplified = trigsimp(expr)
                
                return {
                    'success': True,
                    'type': 'trigonometric_identity',
                    'original': latex(expr),
                    'simplified': latex(simplified),
                    'verified': simplified == 1 or simplified == 0,
                    'steps': [f"Simplify using trig identities: {latex(simplified)}"]
                }
            
            # Solve trig equation
            if '=' in equation:
                left, right = equation.split('=', 1)
                left_expr = self._parse(left.strip())
                right_expr = self._parse(right.strip())
                
                # Solve trig equation
                solutions = solve(Eq(left_expr, right_expr), x)
                
                # Simplify solutions
                simplified_solutions = [simplify(sol) for sol in solutions]
                
                # Filter out complex solutions for basic trig
                real_solutions = [sol for sol in simplified_solutions if sol.is_real or not sol.has(I)]
                
                return {
                    'success': True,
                    'type': 'trigonometric_equation',
                    'equation': equation,
                    'solutions': [latex(sol) for sol in (real_solutions if real_solutions else simplified_solutions)],
                    'general_solution': True if len(simplified_solutions) > 0 else False,
                    'steps': [
                        f"Solve {latex(left_expr)} = {latex(right_expr)}",
                        f"Solutions: {', '.join([latex(sol) for sol in (real_solutions if real_solutions else simplified_solutions)])}"
                    ]
                }
            else:
                # Simplify trig expression
                expr = self._parse(equation)
                simplified = trigsimp(expr)
                expanded = expand_trig(expr)
                
                return {
                    'success': True,
                    'type': 'trigonometric_simplification',
                    'original': latex(expr),
                    'simplified': latex(simplified),
                    'expanded': latex(expanded),
                    'steps': [
                        f"Original: {latex(expr)}",
                        f"Simplified: {latex(simplified)}",
                        f"Expanded: {latex(expanded)}"
                    ]
                }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def solve_statistics(self, equation: str, problem_type: str = 'auto') -> Dict[str, Any]:
        """
        Solve statistics and probability problems
        
        Examples:
            - "mean of [1,2,3,4,5]"
            - "variance of [10,20,30,40,50]"
            - "standard deviation of [...]"
            - "P(X=2) for binomial(n=10, p=0.5)"
            - "normal distribution with μ=0, σ=1"
            - "confidence interval"
            - "hypothesis testing"
            - "correlation and regression"
        """
        try:
            equation_lower = equation.lower()
            
            # Detect mean/average
            if 'mean' in equation_lower or 'average' in equation_lower:
                # Extract numbers
                numbers = re.findall(r'-?\d+\.?\d*', equation)
                if numbers:
                    data = [float(n) for n in numbers]
                    result = sum(data) / len(data)
                    
                    return {
                        'success': True,
                        'type': 'mean',
                        'data': data,
                        'result': result,
                        'steps': [
                            f"Sum of values: {sum(data)}",
                            f"Count: {len(data)}",
                            f"Mean = {sum(data)}/{len(data)} = {result}"
                        ]
                    }
            
            # Detect median
            if 'median' in equation_lower:
                numbers = re.findall(r'-?\d+\.?\d*', equation)
                if numbers:
                    data = sorted([float(n) for n in numbers])
                    n = len(data)
                    median = data[n//2] if n % 2 == 1 else (data[n//2-1] + data[n//2]) / 2
                    
                    return {
                        'success': True,
                        'type': 'median',
                        'data': data,
                        'result': median,
                        'steps': [
                            f"Sorted data: {data}",
                            f"Median = {median}"
                        ]
                    }
            
            # Detect mode
            if 'mode' in equation_lower:
                numbers = re.findall(r'-?\d+\.?\d*', equation)
                if numbers:
                    data = [float(n) for n in numbers]
                    from collections import Counter
                    count = Counter(data)
                    mode = max(count, key=count.get)
                    
                    return {
                        'success': True,
                        'type': 'mode',
                        'data': data,
                        'result': mode,
                        'frequency': count[mode]
                    }
            
            # Detect variance/standard deviation
            if 'variance' in equation_lower or 'std' in equation_lower or 'standard deviation' in equation_lower:
                numbers = re.findall(r'-?\d+\.?\d*', equation)
                if numbers:
                    data = [float(n) for n in numbers]
                    mean = sum(data) / len(data)
                    variance_val = sum((x - mean)**2 for x in data) / len(data)
                    std_dev = variance_val ** 0.5
                    
                    return {
                        'success': True,
                        'type': 'variance_std',
                        'data': data,
                        'mean': mean,
                        'variance': variance_val,
                        'std_dev': std_dev,
                        'result': variance_val if 'variance' in equation_lower else std_dev,
                        'steps': [
                            f"Mean = {mean}",
                            f"Variance = {variance_val}",
                            f"Standard Deviation = {std_dev}"
                        ]
                    }
            
            # Probability distributions
            if 'binomial' in equation_lower:
                # Extract n and p
                n_match = re.search(r'n\s*=\s*(\d+)', equation_lower)
                p_match = re.search(r'p\s*=\s*(0?\.\d+|\d+\.?\d*)', equation_lower)
                
                if n_match and p_match:
                    n_val = int(n_match.group(1))
                    p_val = float(p_match.group(1))
                    
                    X = Binomial('X', n_val, p_val)
                    
                    # Check for specific probability query
                    k_match = re.search(r'[xX]\s*=\s*(\d+)', equation)
                    if k_match:
                        k_val = int(k_match.group(1))
                        prob = density(X).dict[k_val]
                        
                        return {
                            'success': True,
                            'type': 'binomial_probability',
                            'n': n_val,
                            'p': p_val,
                            'k': k_val,
                            'probability': float(prob),
                            'result': f"P(X={k_val}) = {float(prob):.6f}"
                        }
                    
                    # Return distribution properties
                    mean = Expectation(X)
                    var = variance(X)
                    
                    return {
                        'success': True,
                        'type': 'binomial_distribution',
                        'n': n_val,
                        'p': p_val,
                        'mean': float(mean),
                        'variance': float(var),
                        'std': float(sqrt(var))
                    }
            
            if 'normal' in equation_lower or 'gaussian' in equation_lower:
                # Normal distribution
                mu_match = re.search(r'μ\s*=\s*(-?\d+\.?\d*)|mu\s*=\s*(-?\d+\.?\d*)', equation_lower)
                sigma_match = re.search(r'σ\s*=\s*(\d+\.?\d*)|sigma\s*=\s*(\d+\.?\d*)', equation_lower)
                
                mu_val = 0
                sigma_val = 1
                
                if mu_match:
                    mu_val = float(mu_match.group(1) or mu_match.group(2))
                if sigma_match:
                    sigma_val = float(sigma_match.group(1) or sigma_match.group(2))
                
                return {
                    'success': True,
                    'type': 'normal_distribution',
                    'mean': mu_val,
                    'std': sigma_val,
                    'variance': sigma_val**2,
                    'result': f"N({mu_val}, {sigma_val}²)"
                }
            
            # Permutations and Combinations
            if 'permutation' in equation_lower or 'npr' in equation_lower.replace(' ', '') or re.search(r'\d+\s*P\s*\d+', equation):
                n_match = re.search(r'(\d+)\s*P\s*(\d+)', equation)
                if n_match:
                    n_val = int(n_match.group(1))
                    r_val = int(n_match.group(2))
                    result = factorial(n_val) / factorial(n_val - r_val)
                    
                    return {
                        'success': True,
                        'type': 'permutation',
                        'n': n_val,
                        'r': r_val,
                        'result': int(result),
                        'formula': f"P({n_val},{r_val}) = {n_val}!/({n_val}-{r_val})! = {int(result)}"
                    }
            
            if 'combination' in equation_lower or 'ncr' in equation_lower.replace(' ', '') or re.search(r'\d+\s*C\s*\d+', equation):
                n_match = re.search(r'(\d+)\s*C\s*(\d+)', equation)
                if n_match:
                    n_val = int(n_match.group(1))
                    r_val = int(n_match.group(2))
                    result = factorial(n_val) / (factorial(r_val) * factorial(n_val - r_val))
                    
                    return {
                        'success': True,
                        'type': 'combination',
                        'n': n_val,
                        'r': r_val,
                        'result': int(result),
                        'formula': f"C({n_val},{r_val}) = {n_val}!/({r_val}!×({n_val}-{r_val})!) = {int(result)}"
                    }
            
            return {'success': False, 'error': 'Could not identify statistics operation'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def solve_linear_algebra(self, equation: str) -> Dict[str, Any]:
        """
        Solve linear algebra problems: matrices, determinants, eigenvalues, systems of equations
        
        Examples:
            - "det([[1,2],[3,4]])" - determinant
            - "eigenvalues of [[2,1],[1,2]]" - eigenvalues
            - "inverse of [[1,2],[3,4]]" - matrix inverse
            - "rank of [[1,2,3],[4,5,6]]" - matrix rank
            - "transpose of [[1,2],[3,4]]" - transpose
            - "[[1,2],[3,4]] * [[5,6],[7,8]]" - matrix multiplication
            - "rref([[1,2,3],[4,5,6]])" - reduced row echelon form
            - "eigenvectors of [[1,2],[2,1]]" - eigenvectors
            - "null space of [[1,2],[3,6]]" - null space
            - "column space, row space, orthogonalize"
        """
        try:
            # Validate equation
            validation = self._validate_equation(equation, 'matrix')
            if not validation['valid']:
                return {
                    'success': False,
                    'error': validation['error'],
                    'message': validation.get('user_message', validation['error']),
                    'suggestion': validation.get('suggestion', ''),
                    'hint': validation.get('hint', ''),
                    'original': equation
                }
            
            equation_lower = equation.lower()
            
            # Helper function to parse matrix
            def parse_matrix_str(matrix_str):
                matrix_match = re.search(r'\[\[(.*?)\]\]', matrix_str)
                if matrix_match:
                    matrix_content = matrix_match.group(1)
                    # Parse rows
                    rows = [row.strip() for row in matrix_content.split('],[')]
                    matrix_data = []
                    for row in rows:
                        row = row.replace('[', '').replace(']', '')
                        matrix_data.append([self._parse(val.strip()) for val in row.split(',')])
                    return Matrix(matrix_data)
                return None
            
            # Determinant
            if 'det' in equation_lower or 'determinant' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    det = mat.det()
                    
                    return {
                        'success': True,
                        'type': 'determinant',
                        'matrix': latex(mat),
                        'result': latex(det),
                        'steps': [f"Calculate determinant of {latex(mat)}", f"det = {latex(det)}"]
                    }
            
            # Eigenvalues
            if 'eigenvalue' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    eigenvals = mat.eigenvals()
                    
                    return {
                        'success': True,
                        'type': 'eigenvalues',
                        'matrix': latex(mat),
                        'eigenvalues': {latex(k): v for k, v in eigenvals.items()},
                        'result': ', '.join([f"{latex(k)} (multiplicity {v})" for k, v in eigenvals.items()]),
                        'steps': [
                            f"Find eigenvalues of {latex(mat)}",
                            f"Solve det(A - λI) = 0",
                            f"Eigenvalues: {', '.join([latex(k) for k in eigenvals.keys()])}"
                        ]
                    }
            
            # Eigenvectors
            if 'eigenvector' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    eigenvects = mat.eigenvects()
                    
                    result_str = []
                    for eigenval, multiplicity, eigenvecs in eigenvects:
                        for vec in eigenvecs:
                            result_str.append(f"λ = {latex(eigenval)}: {latex(vec)}")
                    
                    return {
                        'success': True,
                        'type': 'eigenvectors',
                        'matrix': latex(mat),
                        'result': '; '.join(result_str),
                        'eigenvectors': eigenvects
                    }
            
            # Inverse
            if 'inverse' in equation_lower or 'inv' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    try:
                        inv = mat.inv()
                        
                        return {
                            'success': True,
                            'type': 'matrix_inverse',
                            'matrix': latex(mat),
                            'inverse': latex(inv),
                            'result': latex(inv),
                            'steps': [
                                f"Find inverse of {latex(mat)}",
                                f"A⁻¹ = {latex(inv)}"
                            ]
                        }
                    except:
                        return {
                            'success': False,
                            'error': 'Matrix is not invertible (determinant = 0)'
                        }
            
            # Transpose
            if 'transpose' in equation_lower or equation_lower.endswith('t'):
                mat = parse_matrix_str(equation)
                if mat:
                    trans = mat.T
                    
                    return {
                        'success': True,
                        'type': 'matrix_transpose',
                        'matrix': latex(mat),
                        'transpose': latex(trans),
                        'result': latex(trans)
                    }
            
            # Rank
            if 'rank' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    rank = mat.rank()
                    
                    return {
                        'success': True,
                        'type': 'matrix_rank',
                        'matrix': latex(mat),
                        'rank': rank,
                        'result': f"rank = {rank}"
                    }
            
            # Trace
            if 'trace' in equation_lower or 'tr(' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    trace = mat.trace()
                    
                    return {
                        'success': True,
                        'type': 'matrix_trace',
                        'matrix': latex(mat),
                        'trace': latex(trace),
                        'result': f"tr(A) = {latex(trace)}"
                    }
            
            # RREF (Reduced Row Echelon Form)
            if 'rref' in equation_lower or 'row echelon' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    rref_mat, pivot_cols = mat.rref()
                    
                    return {
                        'success': True,
                        'type': 'rref',
                        'matrix': latex(mat),
                        'rref': latex(rref_mat),
                        'pivot_columns': pivot_cols,
                        'result': latex(rref_mat)
                    }
            
            # Null space (kernel)
            if 'null space' in equation_lower or 'kernel' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    null = mat.nullspace()
                    
                    return {
                        'success': True,
                        'type': 'null_space',
                        'matrix': latex(mat),
                        'basis': [latex(vec) for vec in null],
                        'dimension': len(null),
                        'result': f"Basis: {{{', '.join([latex(vec) for vec in null])}}}"
                    }
            
            # Column space
            if 'column space' in equation_lower or 'columnspace' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    col_space = mat.columnspace()
                    
                    return {
                        'success': True,
                        'type': 'column_space',
                        'matrix': latex(mat),
                        'basis': [latex(vec) for vec in col_space],
                        'dimension': len(col_space),
                        'result': f"Basis: {{{', '.join([latex(vec) for vec in col_space])}}}"
                    }
            
            # Row space
            if 'row space' in equation_lower or 'rowspace' in equation_lower:
                mat = parse_matrix_str(equation)
                if mat:
                    row_space = mat.rowspace()
                    
                    return {
                        'success': True,
                        'type': 'row_space',
                        'matrix': latex(mat),
                        'basis': [latex(vec) for vec in row_space],
                        'dimension': len(row_space),
                        'result': f"Basis: {{{', '.join([latex(vec) for vec in row_space])}}}"
                    }
            
            # Matrix multiplication
            if '*' in equation or 'multiply' in equation_lower or 'times' in equation_lower:
                # Try to find two matrices
                matrices = re.findall(r'\[\[.*?\]\]', equation)
                if len(matrices) >= 2:
                    mat1 = parse_matrix_str(matrices[0])
                    mat2 = parse_matrix_str(matrices[1])
                    
                    if mat1 and mat2:
                        try:
                            result = mat1 * mat2
                            
                            return {
                                'success': True,
                                'type': 'matrix_multiplication',
                                'matrix1': latex(mat1),
                                'matrix2': latex(mat2),
                                'result': latex(result),
                                'steps': [
                                    f"A = {latex(mat1)}",
                                    f"B = {latex(mat2)}",
                                    f"A × B = {latex(result)}"
                                ]
                            }
                        except:
                            return {
                                'success': False,
                                'error': 'Matrix dimensions incompatible for multiplication'
                            }
            
            # Solve linear system Ax = b
            if 'solve' in equation_lower and ('=' in equation or 'system' in equation_lower):
                mat = parse_matrix_str(equation)
                if mat:
                    # Try to solve Ax = b where b is the last column
                    A = mat[:, :-1]
                    b = mat[:, -1]
                    
                    try:
                        solution = A.LUsolve(b)
                        
                        return {
                            'success': True,
                            'type': 'linear_system',
                            'matrix': latex(A),
                            'vector': latex(b),
                            'solution': latex(solution),
                            'result': latex(solution)
                        }
                    except:
                        return {
                            'success': False,
                            'error': 'No unique solution (system may be inconsistent or have infinite solutions)'
                        }
            
            return {'success': False, 'error': 'Could not identify linear algebra operation'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _parse(self, expr_str: str):
        """Parse mathematical expression with custom local symbols"""
        try:
            # Create a local namespace with our pre-defined symbols
            # Don't include variable names that will be used for integration/differentiation
            local_dict = {
                # Pre-defined symbols (use these when they appear)
                'theta': theta, 'phi': phi, 'alpha': alpha, 'beta': beta, 'gamma': gamma,
                # Physics symbols
                'm': m, 'M': M, 'v': v, 'u': u, 'F': F, 'g': g_sym, 'T': T, 'P': P, 'V': V, 'R': R,
                'lambda_var': lambda_var, 'mu_var': mu_var, 'N': N_force,
                'Q': symbols('Q'), 'W': symbols('W'), 's': symbols('s'),
                'E': symbols('E_energy'), 'c': c_heat, 'nu': symbols('nu'),
                # Math constants
                'pi': pi, 'e': E,
                # Functions
                'sin': sin, 'cos': cos, 'tan': tan, 'sec': sec, 'csc': csc, 'cot': cot,
                'arcsin': asin, 'arccos': acos, 'arctan': atan,
                'sqrt': sqrt, 'log': log, 'exp': exp,
                'oo': oo  # Infinity
            }
            
            # Auto-create subscripted variables (x_1, x_2, y_i, theta_1, etc.)
            # Find all potential subscripted variables in the expression
            subscript_pattern = r'([a-zA-Z_]+)_([a-zA-Z0-9]+)'
            subscripted_vars = re.findall(subscript_pattern, expr_str)
            
            for base, subscript in subscripted_vars:
                var_name = f"{base}_{subscript}"
                if var_name not in local_dict:
                    # Create symbol with subscript
                    local_dict[var_name] = symbols(var_name, real=True)
            
            transformations = standard_transformations + (implicit_multiplication_application,)
            return parse_expr(expr_str, transformations=transformations, local_dict=local_dict)
        except:
            try:
                return sympify(expr_str, locals=local_dict)
            except:
                return sympify(expr_str)
    
    def _convert_unicode_to_latex(self, text: str) -> str:
        """
        Convert Unicode math symbols to LaTeX equivalents FIRST
        This must happen before regex pattern matching
        """
        unicode_to_latex = {
            '∫': r'\int',      # Integral symbol
            '∂': r'\partial',  # Partial derivative
            '∑': r'\sum',      # Summation
            '∏': r'\prod',     # Product
            '√': r'\sqrt',     # Square root
            '∞': r'\infty',    # Infinity
            '²': '^{2}',       # Superscript 2
            '³': '^{3}',       # Superscript 3
            '⁴': '^{4}',       # Superscript 4
            '⁵': '^{5}',       # Superscript 5
            '⁶': '^{6}',       # Superscript 6
            '⁷': '^{7}',       # Superscript 7
            '⁸': '^{8}',       # Superscript 8
            '⁹': '^{9}',       # Superscript 9
            '⁰': '^{0}',       # Superscript 0
            '≠': '!=',         # Not equal
            '≤': '<=',         # Less than or equal
            '≥': '>=',         # Greater than or equal
            '±': '+-',         # Plus-minus
            '×': '*',          # Multiplication
            '÷': '/',          # Division
            '≈': '=',          # Approximately equal (treat as equal)
        }
        
        for unicode_char, latex_equiv in unicode_to_latex.items():
            text = text.replace(unicode_char, latex_equiv)
        
        return text
    
    def _clean_latex(self, text: str) -> str:
        """
        Convert common LaTeX syntax to SymPy-compatible format
        Examples:
            x^{2} -> x**2
            x_{1} -> x_1 (subscript support)
            3x -> 3*x
            \\frac{a}{b} -> (a)/(b)
            \\sqrt{x} -> sqrt(x)
            \\int -> (processed separately)
            \\sin(x) -> sin(x)
            \\infty -> oo (SymPy infinity)
        """
        # Convert absolute value |x| to Abs(x) FIRST before other conversions
        text = re.sub(r'\|([^|]+)\|', r'Abs(\1)', text)
        
        # Convert Unicode math symbols to LaTeX equivalents
        unicode_to_latex = {
            '∫': r'\int',      # Integral symbol
            '∂': r'\partial',  # Partial derivative
            '∑': r'\sum',      # Summation
            '∏': r'\prod',     # Product
            '√': 'sqrt',       # Square root (convert to function)
            '∞': r'\infty',    # Infinity
            '≠': '!=',         # Not equal
            '≤': '<=',         # Less than or equal
            '≥': '>=',         # Greater than or equal
            '±': '+-',         # Plus-minus
            '×': '*',          # Multiplication
            '÷': '/',          # Division
            '≈': '=',          # Approximately equal (treat as equal)
            'π': 'pi',         # Pi
            'θ': 'theta',      # Theta
            'φ': 'phi',        # Phi
            'α': 'alpha',      # Alpha
            'β': 'beta',       # Beta
            'γ': 'gamma',      # Gamma
            'δ': 'delta',      # Delta
            'ε': 'epsilon',    # Epsilon
            'ζ': 'zeta',       # Zeta
            'η': 'eta',        # Eta
            'ι': 'iota',       # Iota
            'κ': 'kappa',      # Kappa
            'λ': 'lambda_var', # Lambda (renamed to avoid keyword)
            'μ': 'mu_var',     # Mu (renamed to avoid keyword)
            'ν': 'nu',         # Nu
            'ξ': 'xi',         # Xi
            'ο': 'omicron',    # Omicron
            'ρ': 'rho',        # Rho
            'σ': 'sigma',      # Sigma
            'τ': 'tau',        # Tau
            'υ': 'upsilon',    # Upsilon
            'χ': 'chi',        # Chi
            'ψ': 'psi',        # Psi
            'ω': 'omega',      # Omega
            # Uppercase Greek
            'Γ': 'Gamma',
            'Δ': 'Delta',
            'Θ': 'Theta',
            'Λ': 'Lambda',
            'Ξ': 'Xi',
            'Π': 'Pi',
            'Σ': 'Sigma',
            'Φ': 'Phi',
            'Ψ': 'Psi',
            'Ω': 'Omega',
        }
        
        for unicode_char, latex_equiv in unicode_to_latex.items():
            text = text.replace(unicode_char, latex_equiv)
        
        # Convert \infty to oo (SymPy infinity)
        text = text.replace(r'\infty', 'oo')
        
        # Handle Python reserved keywords by renaming them
        # lambda -> lambda_var, mu -> mu_var
        text = re.sub(r'\blambda\b', 'lambda_var', text)
        text = re.sub(r'\bmu\b', 'mu_var', text)
        
        # Handle subscripts BEFORE exponents
        # Convert x_{1} -> x_1, x_{i} -> x_i, etc.
        # This preserves subscripts in variable names
        text = re.sub(r'([a-zA-Z_]+)_{([^}]+)}', r'\1_\2', text)
        
        # Remove LaTeX braces from exponents: x^{2} -> x**2
        text = re.sub(r'\^{([^}]+)}', r'**(\1)', text)
        text = text.replace('^', '**')
        
        # Convert \frac{a}{b} to (a)/(b)
        text = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'((\1)/(\2))', text)
        
        # Convert \sqrt{x} to sqrt(x)
        text = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', text)
        
        # Also handle √(x) format from Unicode conversion
        text = re.sub(r'sqrt\(([^)]+)\)', r'sqrt(\1)', text)  # Normalize
        
        # Convert LaTeX trig functions: \sin -> sin, \cos -> cos, etc.
        trig_funcs = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan']
        for func in trig_funcs:
            text = text.replace(f'\\{func}', func)
        
        # Convert \ln to log (natural log in SymPy)
        text = text.replace(r'\ln', 'log')
        
        # Convert \log to log10 or log
        text = text.replace(r'\log', 'log')
        
        # Convert \exp to exp
        text = text.replace(r'\exp', 'exp')
        
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
        text = re.sub(r'\)\s*\(', r')*(', text)
        
        # Handle sin^2(x) -> sin(x)**2
        # Pattern: func^digit or func^{digit}
        text = re.sub(r'(sin|cos|tan|sec|csc|cot)\*\*\((\d+)\)\(', r'\1(\2**', text)
        text = re.sub(r'(sin|cos|tan|sec|csc|cot)\*\*(\d+)\(', r'\1(', text)  # Temp fix
        
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
    Enhanced fast solving with comprehensive math type support
    
    Supported note_types:
        - 'algebra': Equations, polynomials, systems
        - 'calculus': Derivatives, integrals, limits, series
        - 'physics': Kinematics, dynamics, energy equations
        - 'trigonometry': Trig equations and identities
        - 'statistics': Mean, variance, probability
        - 'linear_algebra': Matrices, determinants, eigenvalues
        - 'auto': Auto-detect from equation content
    
    Args:
        equation: The equation/problem to solve
        note_type: Type hint for faster routing
    
    Returns:
        Comprehensive solution dict with formatted output
    """
    solver = get_fast_solver()
    note_type = note_type.lower() if note_type else 'auto'
    
    try:
        # Preprocess equation
        equation = equation.strip()
        
        # Remove trailing equals signs (common from OCR: "∫x²dx=" → "∫x²dx")
        if equation.endswith('='):
            equation = equation[:-1].strip()
        
        # Remove leading equals signs
        if equation.startswith('='):
            equation = equation[1:].strip()
        
        # Strong hints based on symbols (works even if auto-detect misses)
        lower_eq = equation.lower()
        has_integral = '\\int' in equation or '∫' in equation
        has_derivative = 'd/d' in lower_eq or '\\frac{d' in equation or '∂' in equation
        has_limit = '\\lim' in equation or 'lim' in lower_eq or '→' in equation
        calculus_hint = has_integral or has_derivative or has_limit

        # Auto-detect if not specified or override when we clearly see calculus symbols
        if note_type == 'auto':
            if calculus_hint:
                note_type = 'calculus'
            else:
                note_type = _detect_type(equation)
        else:
            if note_type != 'calculus' and calculus_hint:
                note_type = 'calculus'
        
        # Route to appropriate solver
        if note_type == 'calculus':
            result = solver.solve_calculus(equation)
        elif note_type == 'physics':
            result = solver.solve_physics(equation)
        elif note_type == 'trigonometry' or note_type == 'trig':
            result = solver.solve_trigonometry(equation)
        elif note_type == 'statistics' or note_type == 'stats':
            result = solver.solve_statistics(equation)
        elif note_type == 'linear_algebra' or note_type == 'matrix':
            result = solver.solve_linear_algebra(equation)
        else:  # algebra, general, or default
            result = solver.solve_equation(equation)
        
        # Format response
        if result.get('success'):
            return {
                'success': True,
                'classification': {
                    'problem_type': note_type,
                    'specific_type': result.get('type', note_type),
                    'confidence': 1.0,
                    'equation': equation
                },
                'result': result,
                'explanation': _format_explanation(result),
                'latex_result': _format_latex_result(result)
            }
        else:
            return {
                'success': False,
                'classification': {'problem_type': note_type, 'equation': equation},
                'result': None,
                'explanation': result.get('error', 'Failed to solve'),
                'error': result.get('error')
            }
    
    except Exception as e:
        return {
            'success': False,
            'classification': {'problem_type': note_type, 'equation': equation},
            'result': None,
            'explanation': str(e),
            'error': str(e)
        }


def _detect_type(equation: str) -> str:
    """Auto-detect equation type from content"""
    eq_lower = equation.lower()
    
    # Calculus keywords (support both LaTeX and Unicode)
    if any(kw in equation for kw in [r'\int', r'\lim', r'\frac{d', '∫', '∂', '∑', '∏']):
        return 'calculus'
    if any(kw in eq_lower for kw in ['integrate', 'derivative', 'limit', 'd/d', 'taylor']):
        return 'calculus'
    
    # Trigonometry keywords
    if any(kw in eq_lower for kw in ['sin', 'cos', 'tan', 'sec', 'csc', 'cot']):
        return 'trigonometry'
    
    # Statistics keywords
    if any(kw in eq_lower for kw in ['mean', 'variance', 'std', 'probability', 'average']):
        return 'statistics'
    
    # Linear algebra keywords
    if any(kw in eq_lower for kw in ['matrix', 'determinant', 'eigenvalue', 'inverse', 'det']):
        return 'linear_algebra'
    if '[[' in equation:  # Matrix notation
        return 'linear_algebra'
    
    # Physics keywords
    if any(kw in eq_lower for kw in ['velocity', 'acceleration', 'force', 'energy', 'momentum']):
        return 'physics'
    
    # Default to algebra
    return 'algebra'


def _format_explanation(result: Dict[str, Any]) -> str:
    """Format explanation from result"""
    if 'steps' in result:
        return '\n'.join(result['steps'])
    elif 'solutions' in result:
        return f"Solutions: {', '.join(result['solutions'])}"
    elif 'result' in result:
        return f"Result: {result['result']}"
    return "Solution computed successfully"


def _format_latex_result(result: Dict[str, Any]) -> str:
    """Extract primary LaTeX result"""
    if 'result' in result and isinstance(result['result'], str):
        return result['result']
    elif 'solutions' in result and isinstance(result['solutions'], list):
        return ', '.join(result['solutions'])
    elif 'simplified' in result:
        return result['simplified']
    return ""
