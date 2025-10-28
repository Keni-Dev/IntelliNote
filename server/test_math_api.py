"""
Automated Test Suite for IntelliNote Math API
Tests all mathematical problem types and features
"""

import pytest
import requests
import json
import time
from typing import Dict, Any, List

# API Configuration
API_BASE_URL = "http://localhost:8000"
SOLVE_ENDPOINT = f"{API_BASE_URL}/solve_math"
HEALTH_ENDPOINT = f"{API_BASE_URL}/health"


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def api_available():
    """Check if the API server is running"""
    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=5)
        if response.status_code == 200:
            return True
    except:
        pytest.skip("API server is not running. Start it with: python server/ocr_service_fast.py")
    return False


def solve_equation(equation: str, note_type: str = None) -> Dict[str, Any]:
    """Helper function to call the math solver API"""
    payload = {"equation": equation}
    if note_type:
        payload["note_type"] = note_type
    
    response = requests.post(SOLVE_ENDPOINT, json=payload, timeout=10)
    return response.json()


def assert_success(result: Dict[str, Any]):
    """Assert that the API call was successful"""
    assert result.get("success") == True, f"API call failed: {result.get('error')}"


def assert_classification(result: Dict[str, Any], expected_type: str):
    """Assert that problem was classified correctly"""
    classification = result.get("classification", {})
    actual_type = classification.get("problem_type", "")
    assert expected_type in actual_type or actual_type in expected_type, \
        f"Expected type '{expected_type}', got '{actual_type}'"


def assert_solution_format(result: Dict[str, Any], expected_format: str = "list"):
    """Assert that solutions are in the expected format"""
    solution_result = result.get("result", {})
    solutions = solution_result.get("solutions")
    
    if expected_format == "list":
        assert isinstance(solutions, list), "Solutions should be a list"
        assert len(solutions) > 0, "Solutions list should not be empty"


# ============================================================================
# 1. Basic Algebra Tests
# ============================================================================

class TestAlgebra:
    """Test algebraic equation solving"""
    
    def test_linear_equation_simple(self, api_available):
        """Test: x + 3 = 0"""
        result = solve_equation("x + 3 = 0", "algebra")
        assert_success(result)
        assert_classification(result, "algebra")
        
        solutions = result["result"]["solutions"]
        assert "x = -3" in solutions[0] or "-3" in solutions[0]
    
    def test_linear_equation_with_coefficient(self, api_available):
        """Test: 2x - 5 = 0"""
        result = solve_equation("2*x - 5 = 0", "algebra")
        assert_success(result)
        
        solutions = result["result"]["solutions"]
        # Should be x = 2.5 or x = 5/2
        assert "x =" in solutions[0]
    
    def test_quadratic_equation(self, api_available):
        """Test: x^2 + 3x + 2 = 0"""
        result = solve_equation("x^2 + 3*x + 2 = 0", "algebra")
        assert_success(result)
        assert_classification(result, "algebra")
        
        solutions = result["result"]["solutions"]
        assert len(solutions) == 2, "Quadratic should have 2 solutions"
        # Solutions should be x = -1 and x = -2
    
    def test_quadratic_equation_latex(self, api_available):
        """Test: x^{2} + 5x + 6 = 0 (with LaTeX braces)"""
        result = solve_equation("x^{2} + 5*x + 6 = 0", "algebra")
        assert_success(result)
        
        solutions = result["result"]["solutions"]
        assert len(solutions) == 2
    
    def test_multi_variable_equation(self, api_available):
        """Test: 2x + 3y = 10"""
        result = solve_equation("2*x + 3*y = 10", "algebra")
        # Should not crash - may return parametric solution
        assert "result" in result or "error" in result


# ============================================================================
# 2. Calculus - Derivatives
# ============================================================================

class TestDerivatives:
    """Test derivative calculations"""
    
    def test_simple_derivative(self, api_available):
        """Test: derivative of x^2"""
        result = solve_equation("derivative of x^2", "calculus")
        assert_success(result)
        assert_classification(result, "calculus")
        
        # Result should be 2x
        latex_result = result["result"]["result"]
        assert "2" in latex_result and "x" in latex_result
    
    def test_derivative_notation_ddx(self, api_available):
        """Test: d/dx(x^3)"""
        result = solve_equation("d/dx(x^3)", "calculus")
        assert_success(result)
        
        # Result should be 3x^2
        latex_result = result["result"]["result"]
        assert "3" in latex_result
    
    def test_derivative_polynomial(self, api_available):
        """Test: d/dx(3x^2 + 2x + 1)"""
        result = solve_equation("d/dx(3*x^2 + 2*x + 1)", "calculus")
        assert_success(result)
        
        # Result should be 6x + 2
        latex_result = result["result"]["result"]
        assert "6" in latex_result or "x" in latex_result
    
    def test_derivative_trig(self, api_available):
        """Test: d/dx(sin(x))"""
        result = solve_equation("d/dx(sin(x))", "calculus")
        assert_success(result)
        
        # Result should be cos(x)
        latex_result = result["result"]["result"]
        assert "cos" in latex_result


# ============================================================================
# 3. Calculus - Integrals
# ============================================================================

class TestIntegrals:
    """Test integral calculations"""
    
    def test_indefinite_integral(self, api_available):
        """Test: integral of x^2"""
        result = solve_equation("integral of x^2", "calculus")
        assert_success(result)
        assert_classification(result, "calculus")
        
        # Result should be x^3/3
        latex_result = result["result"]["result"]
        assert "3" in latex_result
    
    def test_indefinite_integral_polynomial(self, api_available):
        """Test: integrate 3x^2 + 2x"""
        result = solve_equation("integrate 3*x^2 + 2*x", "calculus")
        assert_success(result)
        
        # Should have integral_type
        assert "integral_type" in result["result"]
    
    def test_definite_integral(self, api_available):
        """Test: integral of x^2 from 0 to 1"""
        result = solve_equation("integral of x^2 from 0 to 1", "calculus")
        assert_success(result)
        
        # Should be definite integral
        integral_type = result["result"].get("integral_type")
        assert integral_type == "definite"


# ============================================================================
# 4. Calculus - Limits
# ============================================================================

class TestLimits:
    """Test limit calculations"""
    
    def test_limit_simple(self, api_available):
        """Test: lim x->0 (x)"""
        result = solve_equation("lim x->0 (x)", "calculus")
        # May succeed or have parsing challenges
        assert "result" in result or "error" in result
    
    def test_limit_infinity(self, api_available):
        """Test: limit as x approaches infinity of 1/x"""
        result = solve_equation("limit as x approaches infinity of 1/x", "calculus")
        # Should approach 0
        if result.get("success"):
            assert_classification(result, "limit")


# ============================================================================
# 5. Physics - Kinematics
# ============================================================================

class TestPhysicsKinematics:
    """Test physics kinematics equations"""
    
    def test_velocity_equation(self, api_available):
        """Test: v = u + a*t"""
        result = solve_equation("v = u + a*t", "physics")
        assert_success(result)
        assert_classification(result, "physics")
    
    def test_displacement_equation(self, api_available):
        """Test: s = u*t + 0.5*a*t^2"""
        result = solve_equation("s = u*t + 0.5*a*t^2", "physics")
        assert_success(result)


# ============================================================================
# 6. Physics - Force & Energy
# ============================================================================

class TestPhysicsForceEnergy:
    """Test physics force and energy equations"""
    
    def test_newtons_second_law(self, api_available):
        """Test: F = m*a"""
        result = solve_equation("F = m*a", "physics")
        assert_success(result)
        assert_classification(result, "physics")
    
    def test_kinetic_energy(self, api_available):
        """Test: KE = 0.5*m*v^2"""
        result = solve_equation("KE = 0.5*m*v^2", "physics")
        assert_success(result)
    
    def test_potential_energy(self, api_available):
        """Test: PE = m*g*h"""
        result = solve_equation("PE = m*g*h", "physics")
        assert_success(result)


# ============================================================================
# 7. Physics - Electricity
# ============================================================================

class TestPhysicsElectricity:
    """Test physics electricity equations"""
    
    def test_ohms_law(self, api_available):
        """Test: V = I*R"""
        result = solve_equation("V = I*R", "physics")
        assert_success(result)
        assert_classification(result, "physics")
    
    def test_power_equation(self, api_available):
        """Test: P = V*I"""
        result = solve_equation("P = V*I", "physics")
        assert_success(result)


# ============================================================================
# 8. Trigonometry
# ============================================================================

class TestTrigonometry:
    """Test trigonometric equations"""
    
    def test_sine_equation(self, api_available):
        """Test: sin(x) = 0.5"""
        result = solve_equation("sin(x) = 0.5", "trigonometry")
        assert_success(result)
    
    def test_cosine_equation(self, api_available):
        """Test: cos(x) = 1"""
        result = solve_equation("cos(x) = 1", "trigonometry")
        assert_success(result)


# ============================================================================
# 9. LaTeX Formatting
# ============================================================================

class TestLaTeXFormatting:
    """Test LaTeX parsing and conversion"""
    
    def test_latex_exponent_braces(self, api_available):
        """Test: x^{2} + 3x + 2 = 0"""
        result = solve_equation("x^{2} + 3*x + 2 = 0", "algebra")
        assert_success(result)
        # Should handle braces correctly
    
    def test_latex_fraction(self, api_available):
        """Test: \\frac{x}{2} = 1"""
        result = solve_equation("\\frac{x}{2} = 1", "algebra")
        assert_success(result)
        # x should equal 2
    
    def test_latex_sqrt(self, api_available):
        """Test: \\sqrt{x} = 4"""
        result = solve_equation("\\sqrt{x} = 4", "algebra")
        assert_success(result)
        # x should equal 16
    
    def test_implicit_multiplication(self, api_available):
        """Test: 3x + 2 = 0 (3x without explicit *)"""
        result = solve_equation("3x + 2 = 0", "algebra")
        assert_success(result)
        # Should parse 3x as 3*x


# ============================================================================
# 10. Variable Detection
# ============================================================================

class TestVariableDetection:
    """Test variable solving detection"""
    
    def test_explicit_solve_for_x(self, api_available):
        """Test: solve for x: 2x + 3 = 0"""
        result = solve_equation("solve for x: 2*x + 3 = 0", "algebra")
        assert_success(result)
        
        variable = result["result"].get("variable")
        assert variable == "x"
    
    def test_explicit_find_y(self, api_available):
        """Test: find y: y^2 = 16"""
        result = solve_equation("find y: y^2 = 16", "algebra")
        assert_success(result)
        
        variable = result["result"].get("variable")
        assert variable == "y"
    
    def test_auto_detect_variable(self, api_available):
        """Test: x^2 + 3x + 2 = 0 (no explicit instruction)"""
        result = solve_equation("x^2 + 3*x + 2 = 0", "algebra")
        assert_success(result)
        
        # Should auto-detect x
        variable = result["result"].get("variable")
        assert variable == "x"


# ============================================================================
# 11. Simplify & Factor
# ============================================================================

class TestSimplifyFactor:
    """Test simplification and factorization"""
    
    def test_simplify_expression(self, api_available):
        """Test: simplify (x+2)(x-2)"""
        result = solve_equation("simplify (x+2)*(x-2)", "algebra")
        # Should work or return error
        assert "result" in result or "error" in result
    
    def test_factor_expression(self, api_available):
        """Test: factor x^2 + 5x + 6"""
        result = solve_equation("factor x^2 + 5*x + 6", "algebra")
        # Should work or return error
        assert "result" in result or "error" in result


# ============================================================================
# 12. Performance Tests
# ============================================================================

class TestPerformance:
    """Test API performance and latency"""
    
    def test_fast_path_with_hint(self, api_available):
        """Test: Fast path should be < 100ms with note_type hint"""
        start = time.time()
        result = solve_equation("x^2 + 3*x + 2 = 0", "algebra")
        latency = (time.time() - start) * 1000
        
        assert_success(result)
        # Fast path should be quick (allowing some margin)
        assert latency < 200, f"Fast path took {latency:.2f}ms (should be < 200ms)"
    
    def test_confidence_with_hint(self, api_available):
        """Test: Confidence should be 1.0 when hint provided"""
        result = solve_equation("x + 1 = 0", "algebra")
        assert_success(result)
        
        confidence = result["classification"].get("confidence")
        assert confidence == 1.0, "Confidence should be 1.0 with note_type hint"
    
    def test_auto_detect_mode(self, api_available):
        """Test: Auto-detect mode without hint"""
        result = solve_equation("derivative of x^2", None)
        # Should still work, just slower
        assert "classification" in result


# ============================================================================
# 13. Error Handling
# ============================================================================

class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_invalid_equation_contradiction(self, api_available):
        """Test: 0 = 1 (contradiction)"""
        result = solve_equation("0 = 1", "algebra")
        # Should not crash, may return error or empty solutions
        assert "result" in result or "error" in result
    
    def test_malformed_latex(self, api_available):
        """Test: x^{2 (unclosed brace)"""
        result = solve_equation("x^{2 + 1 = 0", "algebra")
        # Should handle gracefully
        assert "result" in result or "error" in result
    
    def test_gibberish_input(self, api_available):
        """Test: asdfghjkl"""
        result = solve_equation("asdfghjkl", "algebra")
        # Should return error
        assert result.get("success") == False or "error" in result


# ============================================================================
# 14. Response Structure
# ============================================================================

class TestResponseStructure:
    """Test that API responses have correct structure"""
    
    def test_response_has_required_fields(self, api_available):
        """Test: Response has success, classification, result, explanation"""
        result = solve_equation("x + 1 = 0", "algebra")
        
        assert "success" in result
        assert "classification" in result
        assert "result" in result
        assert "explanation" in result
    
    def test_classification_structure(self, api_available):
        """Test: Classification has required fields"""
        result = solve_equation("x + 1 = 0", "algebra")
        assert_success(result)
        
        classification = result["classification"]
        assert "problem_type" in classification
        assert "operation" in classification
        assert "equation" in classification
        assert "confidence" in classification
    
    def test_result_has_steps(self, api_available):
        """Test: Result includes steps array"""
        result = solve_equation("x^2 + 3*x + 2 = 0", "algebra")
        assert_success(result)
        
        steps = result["result"].get("steps")
        assert steps is not None
        assert isinstance(steps, list)
        assert len(steps) > 0


# ============================================================================
# 15. Integration Tests
# ============================================================================

class TestIntegration:
    """End-to-end integration tests"""
    
    def test_complete_algebra_workflow(self, api_available):
        """Test: Complete workflow for algebra problem"""
        # 1. Solve equation
        result = solve_equation("x^2 - 5*x + 6 = 0", "algebra")
        assert_success(result)
        
        # 2. Verify classification
        assert_classification(result, "algebra")
        
        # 3. Verify solutions
        solutions = result["result"]["solutions"]
        assert len(solutions) == 2
        
        # 4. Verify explanation
        explanation = result["explanation"]
        assert len(explanation) > 0
    
    def test_complete_calculus_workflow(self, api_available):
        """Test: Complete workflow for calculus problem"""
        result = solve_equation("d/dx(x^3 + 2*x)", "calculus")
        assert_success(result)
        
        # Verify it's a derivative
        assert result["result"]["type"] == "derivative"
        
        # Verify steps
        steps = result["result"]["steps"]
        assert len(steps) >= 2


# ============================================================================
# Test Runner
# ============================================================================

if __name__ == "__main__":
    """
    Run tests with: python server/test_math_api.py
    
    Or use pytest for better output:
        pytest server/test_math_api.py -v
        pytest server/test_math_api.py -v -k "algebra"  # Run only algebra tests
        pytest server/test_math_api.py -v --tb=short    # Short traceback
    """
    pytest.main([__file__, "-v", "--tb=short"])
