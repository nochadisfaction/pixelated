#!/usr/bin/env python3
"""
Check current Mem0AI configuration status
"""

import os
from pathlib import Path

def load_env():
    """Load environment variables from .env file"""
    env_path = Path(".env")
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#') and '=' in line:
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def check_status():
    """Check the current status of mem0ai configuration"""
    print("🔍 Mem0AI Configuration Status Check")
    print("=" * 40)
    
    # Load .env variables
    load_env()
    
    # Check API key
    api_key = os.getenv("MEM0_API_KEY")
    if api_key:
        # Mask the key for security
        masked_key = api_key[:8] + "..." + api_key[-4:] if len(api_key) > 12 else "***"
        print(f"✅ MEM0_API_KEY found: {masked_key}")
    else:
        print("❌ MEM0_API_KEY not found")
        return False
    
    # Check user ID
    user_id = os.getenv("DEFAULT_USER_ID", "Not set")
    print(f"👤 User ID: {user_id}")
    
    # Test import
    try:
        import mem0
        print("✅ mem0ai library available")
    except ImportError:
        print("❌ mem0ai library not installed")
        return False
    
    print("\n📋 Next Steps:")
    print("1. If API key is invalid, get a new one from: https://app.mem0.ai/dashboard/api-keys")
    print("2. Update .env file with: MEM0_API_KEY=your_new_key")
    print("3. Or set environment variable: export MEM0_API_KEY='your_new_key'")
    print("4. Then test with: python test_memory_example.py")
    
    return True

if __name__ == "__main__":
    check_status() 