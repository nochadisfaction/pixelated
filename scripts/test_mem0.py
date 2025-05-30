#!/usr/bin/env python3
"""
Test script for mem0 installation and basic functionality.
Run this to verify that mem0 is properly installed and working.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    
    # Look for .env file in the project root
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✓ Loaded environment from {env_path}")
    else:
        print(f"! No .env file found at {env_path}")
        # Try loading from current directory as fallback
        load_dotenv()
except ImportError:
    print("! python-dotenv not installed. Install with: pip install python-dotenv")
    print("  Environment variables will only be loaded from system environment")

def test_import():
    """Test if mem0 can be imported"""
    try:
        import mem0
        print(f"✓ mem0 imported successfully (version: {mem0.__version__})")
        return True
    except ImportError as e:
        print(f"✗ Failed to import mem0: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error importing mem0: {e}")
        return False

def _get_api_key_or_skip():
    """Helper to get API key or return None if not available"""
    api_key = os.getenv("MEM0_API_KEY")
    if not api_key:
        print("! No MEM0_API_KEY found for API test")
    return api_key

def _create_memory_client():
    """Create MemoryClient if API key is available, otherwise return None"""
    api_key = _get_api_key_or_skip()
    if not api_key:
        return None
    
    from mem0 import MemoryClient
    return MemoryClient(api_key=api_key)

def test_memory_client_with_api():
    """Test MemoryClient with actual API key"""
    try:
        client = _create_memory_client()
        success = client is not None
        success and print("✓ MemoryClient with API key initialized successfully")
        return success
    except Exception as e:
        print(f"✗ Failed to initialize MemoryClient with API: {e}")
        return False

def test_basic_operations():
    """Test basic memory operations with API key"""
    try:
        from mem0 import MemoryClient
        
        api_key = os.getenv("MEM0_API_KEY")
        client = MemoryClient(api_key=api_key)
        test_user = "test_user_script"
        
        # Test adding a memory
        print("Testing memory addition...")
        messages = [{"role": "user", "content": "I love pizza and prefer thin crust"}]
        response = client.add(messages, user_id=test_user)
        print(f"✓ Memory added: {response}")
        
        # Test searching memories
        print("Testing memory search...")
        results = client.search("pizza", user_id=test_user, limit=5)
        print(f"✓ Search results: {len(results)} memories found")
        
        # Test getting all memories
        print("Testing get all memories...")
        all_memories = client.get_all(user_id=test_user)
        print(f"✓ Total memories for {test_user}: {len(all_memories)}")
        
        return True
    except Exception as e:
        print(f"✗ Basic operations test failed: {e}")
        return False

def test_env_loading():
    """Test environment variable loading"""
    api_key = os.getenv("MEM0_API_KEY")
    default_user = os.getenv("DEFAULT_USER_ID")
    default_app = os.getenv("DEFAULT_APP_ID")
    
    print("Environment variables:")
    print(f"  MEM0_API_KEY: {'✓ Set' if api_key else '✗ Not set'}")
    print(f"  DEFAULT_USER_ID: {default_user or 'Not set'}")
    print(f"  DEFAULT_APP_ID: {default_app or 'Not set'}")
    
    return bool(api_key)

def test_dotenv_installation():
    """Test if python-dotenv is properly installed"""
    try:
        import dotenv
        print("✓ python-dotenv is installed (version available)")
        return True
    except ImportError:
        print("✗ python-dotenv not installed")
        print("  Install with: pip install python-dotenv")
        return False

def main():
    """Run all tests"""
    print("* Testing mem0 installation and functionality...")
    print("=" * 50)
    
    # Check API key availability
    api_key = os.getenv("MEM0_API_KEY")
    has_api_key = bool(api_key)
    
    if not has_api_key:
        print("! MEM0_API_KEY environment variable not set")
        print("   You'll need to set this to use the actual mem0 service")
    
    # Define tests - basic tests always run, API tests only if key is available
    tests = [
        ("Python-dotenv Installation", test_dotenv_installation),
        ("Environment Loading Test", test_env_loading),
        ("Import Test", test_import),
    ]
    
    if has_api_key:
        tests.extend([
            ("MemoryClient Initialization", test_memory_client_with_api),
            ("Basic Operations Test", test_basic_operations),
        ])
    else:
        print("\n! Skipping API-dependent tests - no MEM0_API_KEY found")
    
    results = []
    for test_name, test_func in tests:
        print(f"\n> Running {test_name}...")
        result = test_func()
        results.append((test_name, result))
        print("-" * 30)
    
    print(f"\n* Test Results:")
    print("=" * 50)
    passed = 0
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nSummary: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("* All tests passed! mem0 is ready to use.")
        return True
    else:
        print("! Some tests failed. Check the output above for details.")
        
        if not has_api_key:
            print("\n* Tip: Set the MEM0_API_KEY environment variable to enable full testing")
        
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 