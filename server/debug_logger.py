"""
Debug Logging Utility for Python Backend

Centralized debug logging based on environment variables.
Each debug category can be enabled/disabled via .env file.

Usage:
    from debug_logger import debug_log, is_debug_enabled
    debug_log('OCR_SERVER', f'Processing image: {filename}')
    if is_debug_enabled('MATH_SOLVER'):
        # Expensive debug operation
        pass
"""

import os
from typing import Any, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Check if master debug is enabled
DEBUG_ALL = os.getenv('DEBUG_ALL', 'false').lower() == 'true'

# Debug flag mappings
DEBUG_FLAGS = {
    # OCR Server
    'OCR_SERVER': os.getenv('DEBUG_OCR_SERVER', 'false').lower() == 'true' or DEBUG_ALL,
    'OCR_SAVE_IMAGES': os.getenv('DEBUG_OCR_SAVE_IMAGES', 'false').lower() == 'true' or DEBUG_ALL,
    'TROCR_MODEL': os.getenv('DEBUG_TROCR_MODEL', 'false').lower() == 'true' or DEBUG_ALL,
    
    # Math Server
    'MATH_SERVER': os.getenv('DEBUG_MATH_SERVER', 'false').lower() == 'true' or DEBUG_ALL,
    'MATH_FAST_PATH': os.getenv('DEBUG_MATH_FAST_PATH', 'false').lower() == 'true' or DEBUG_ALL,
    'MATH_SLOW_PATH': os.getenv('DEBUG_MATH_SLOW_PATH', 'false').lower() == 'true' or DEBUG_ALL,
    'MATH_CLASSIFICATION': os.getenv('DEBUG_MATH_CLASSIFICATION', 'false').lower() == 'true' or DEBUG_ALL,
    'MATH_HISTORY': os.getenv('DEBUG_MATH_HISTORY', 'false').lower() == 'true' or DEBUG_ALL,
    
    # Equation Solving
    'EQUATION_CLASSIFIER': os.getenv('DEBUG_EQUATION_CLASSIFIER', 'false').lower() == 'true' or DEBUG_ALL,
    'SMART_MATH_ENGINE': os.getenv('DEBUG_SMART_MATH_ENGINE', 'false').lower() == 'true' or DEBUG_ALL,
    'FAST_MATH_SOLVER': os.getenv('DEBUG_FAST_MATH_SOLVER', 'false').lower() == 'true' or DEBUG_ALL,
    'PHYSICS_SOLVER': os.getenv('DEBUG_PHYSICS_SOLVER', 'false').lower() == 'true' or DEBUG_ALL,
    
    # Server Health & Monitoring
    'SERVER_HEALTH': os.getenv('DEBUG_SERVER_HEALTH', 'false').lower() == 'true' or DEBUG_ALL,
    'SERVER_STATS': os.getenv('DEBUG_SERVER_STATS', 'false').lower() == 'true' or DEBUG_ALL,
}


def is_debug_enabled(category: str) -> bool:
    """
    Check if a debug category is enabled.
    
    Args:
        category: Debug category name
        
    Returns:
        True if debug is enabled for this category
    """
    return DEBUG_FLAGS.get(category, False)


def debug_log(category: str, *args: Any, **kwargs: Any) -> None:
    """
    Log a debug message if the category is enabled.
    
    Args:
        category: Debug category name
        *args: Arguments to print
        **kwargs: Keyword arguments for print()
    """
    if is_debug_enabled(category):
        print(f"[{category}]", *args, **kwargs)


def debug_warn(category: str, *args: Any, **kwargs: Any) -> None:
    """
    Log a debug warning if the category is enabled.
    
    Args:
        category: Debug category name
        *args: Arguments to print
        **kwargs: Keyword arguments for print()
    """
    if is_debug_enabled(category):
        print(f"[{category}] WARNING:", *args, **kwargs)


def debug_error(category: str, *args: Any, **kwargs: Any) -> None:
    """
    Log a debug error if the category is enabled.
    
    Args:
        category: Debug category name
        *args: Arguments to print
        **kwargs: Keyword arguments for print()
    """
    if is_debug_enabled(category):
        print(f"[{category}] ERROR:", *args, **kwargs)


def get_enabled_debug_flags() -> list[str]:
    """
    Get all enabled debug flags.
    
    Returns:
        List of enabled debug category names
    """
    return [key for key, value in DEBUG_FLAGS.items() if value]


def print_debug_config() -> None:
    """Print debug configuration summary."""
    enabled = get_enabled_debug_flags()
    if not enabled:
        print('[DEBUG] No debug flags enabled')
    elif DEBUG_ALL:
        print('[DEBUG] ALL debug flags enabled')
    else:
        print('[DEBUG] Enabled flags:', ', '.join(enabled))


# Export for easier access
__all__ = [
    'is_debug_enabled',
    'debug_log',
    'debug_warn',
    'debug_error',
    'get_enabled_debug_flags',
    'print_debug_config',
    'DEBUG_FLAGS',
]
