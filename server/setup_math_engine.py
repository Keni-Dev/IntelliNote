#!/usr/bin/env python3
"""
Setup script for Smart Math Engine
Checks dependencies and verifies installation
"""

import sys
import subprocess
import importlib.util

def check_python_version():
    """Check if Python version is 3.8+"""
    print("Checking Python version...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python 3.8+ required. You have {version.major}.{version.minor}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_package(package_name):
    """Check if a Python package is installed"""
    spec = importlib.util.find_spec(package_name)
    return spec is not None

def install_requirements():
    """Install required packages"""
    print("\nInstalling requirements...")
    try:
        subprocess.check_call([
            sys.executable, 
            '-m', 
            'pip', 
            'install', 
            '-r', 
            'requirements.txt'
        ])
        print("✅ Requirements installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def verify_packages():
    """Verify all required packages are installed"""
    print("\nVerifying packages...")
    required_packages = {
        'sympy': 'SymPy (symbolic math)',
        'fastapi': 'FastAPI (web framework)',
        'uvicorn': 'Uvicorn (ASGI server)',
        'transformers': 'Transformers (Hugging Face)',
        'PIL': 'Pillow (image processing)'
    }
    
    all_ok = True
    for package, description in required_packages.items():
        if check_package(package):
            print(f"✅ {description}")
        else:
            print(f"❌ {description} - NOT INSTALLED")
            all_ok = False
    
    return all_ok

def test_math_engine():
    """Test the math engine"""
    print("\nTesting math engine...")
    try:
        from smart_math_engine import SmartMathEngine
        engine = SmartMathEngine()
        result = engine.process("x^2 - 4 = 0")
        if result.get('success'):
            print("✅ Math engine working correctly")
            print(f"   Test: x^2 - 4 = 0")
            print(f"   Result: {result['result']['solutions']}")
            return True
        else:
            print(f"❌ Math engine test failed: {result.get('error')}")
            return False
    except Exception as e:
        print(f"❌ Math engine test failed: {e}")
        return False

def main():
    """Main setup function"""
    print("=" * 60)
    print("SMART MATH ENGINE SETUP")
    print("=" * 60)
    print()
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install requirements
    if not install_requirements():
        print("\n⚠️  Installation failed. Try manually:")
        print("   pip install -r requirements.txt")
        sys.exit(1)
    
    # Verify packages
    if not verify_packages():
        print("\n⚠️  Some packages are missing. Try:")
        print("   pip install -r requirements.txt")
        sys.exit(1)
    
    # Test math engine
    if not test_math_engine():
        print("\n⚠️  Math engine test failed.")
        print("   Check for errors above.")
        sys.exit(1)
    
    # Success!
    print()
    print("=" * 60)
    print("✅ SETUP COMPLETE!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Start the backend server:")
    print("   python ocr_service.py")
    print()
    print("2. In another terminal, start the frontend:")
    print("   cd ..")
    print("   npm run dev")
    print()
    print("3. Open http://localhost:5173")
    print()
    print("For more info, see:")
    print("  • QUICKSTART_MATH_ENGINE.md")
    print("  • MATH_ENGINE_README.md")
    print("=" * 60)

if __name__ == '__main__':
    main()
