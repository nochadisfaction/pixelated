#!/usr/bin/env python3
"""
Mem0AI Configuration Setup Script
This script helps configure mem0ai with your preferred settings.
"""

import os
import sys
from pathlib import Path

def create_env_file():
    """Create or update .env file with mem0 configuration"""
    env_path = Path(".env")
    
    print("🔧 Mem0AI Configuration Setup")
    print("=" * 40)
    
    # Check if .env already exists
    if env_path.exists():
        print("📁 Found existing .env file")
        with open(env_path, 'r') as f:
            content = f.read()
            if "MEM0_API_KEY" in content:
                print("✅ MEM0_API_KEY already configured in .env")
                return
    
    print("\n🔑 Setting up Mem0AI API Configuration")
    print("\nOptions for API Key setup:")
    print("1. Enter API key now (will be stored in .env)")
    print("2. Use environment variable (export MEM0_API_KEY=your_key)")
    print("3. Skip for now (configure manually later)")
    
    choice = input("\nChoose option (1-3): ").strip()
    
    if choice == "1":
        api_key = input("Enter your Mem0AI API key: ").strip()
        if api_key:
            # Create or append to .env file
            env_content = ""
            if env_path.exists():
                with open(env_path, 'r') as f:
                    env_content = f.read()
            
            if "MEM0_API_KEY" not in env_content:
                with open(env_path, 'a') as f:
                    f.write(f"\n# Mem0AI Configuration\nMEM0_API_KEY={api_key}\n")
                print("✅ API key saved to .env file")
            else:
                print("⚠️  MEM0_API_KEY already exists in .env file")
        else:
            print("⚠️  No API key entered")
    
    elif choice == "2":
        print("📝 To set environment variable, run:")
        print("export MEM0_API_KEY='your_api_key_here'")
    
    elif choice == "3":
        print("⏭️  Skipping API key setup")
    
    # Configure user ID
    print("\n👤 User ID Configuration")
    default_user = "default_user"
    user_id = input(f"Enter user ID (default: {default_user}): ").strip()
    if not user_id:
        user_id = default_user
    
    # Update .env with user ID
    env_content = ""
    if env_path.exists():
        with open(env_path, 'r') as f:
            env_content = f.read()
    
    if "DEFAULT_USER_ID" not in env_content:
        with open(env_path, 'a') as f:
            f.write(f"DEFAULT_USER_ID={user_id}\n")
        print(f"✅ User ID set to: {user_id}")

def test_configuration():
    """Test the mem0ai configuration"""
    print("\n🧪 Testing Mem0AI Configuration")
    print("=" * 35)
    
    try:
        # Load environment variables from .env if it exists
        env_path = Path(".env")
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value
        
        # Test import
        try:
            import mem0
            print("✅ mem0ai import successful")
        except ImportError as e:
            print(f"❌ mem0ai import failed: {e}")
            print("💡 Try: pip install mem0ai")
            return False
        
        # Test API key availability
        api_key = os.getenv("MEM0_API_KEY")
        if not api_key:
            print("⚠️  MEM0_API_KEY not found in environment")
            print("💡 Set it with: export MEM0_API_KEY='your_key'")
            print("💡 Or add it to .env file")
            return False
        
        print("✅ API key found")
        
        # Test client initialization
        try:
            from mem0 import MemoryClient
            client = MemoryClient(api_key=api_key)
            print("✅ MemoryClient initialized successfully")
            
            # Test basic functionality with a simple operation
            user_id = os.getenv("DEFAULT_USER_ID", "test_user")
            print(f"✅ Using user ID: {user_id}")
            
            print("🔍 Ready to test memory operations!")
            return True
            
        except Exception as e:
            print(f"❌ Client initialization failed: {e}")
            print("💡 Check your API key and internet connection")
            return False
            
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def create_usage_example():
    """Create a simple usage example script"""
    example_script = """# Example usage script - save as test_memory.py
import os
from mem0 import MemoryClient

# Load configuration
api_key = os.getenv("MEM0_API_KEY")
user_id = os.getenv("DEFAULT_USER_ID", "default_user")

if not api_key:
    print("❌ MEM0_API_KEY not set")
    exit(1)

# Initialize client
client = MemoryClient(api_key=api_key)

# Test adding a memory
try:
    messages = [
        {"role": "user", "content": "I prefer working on backend tasks in the mornings"},
        {"role": "assistant", "content": "I'll remember your preference for morning backend work"}
    ]
    
    result = client.add(messages, user_id=user_id)
    print(f"✅ Memory added: {result}")
    
    # Test searching memories
    search_results = client.search("backend work preference", user_id=user_id)
    print(f"🔍 Search results: {search_results}")
    
except Exception as e:
    print(f"❌ Error: {e}")
"""
    
    with open("test_memory_example.py", "w") as f:
        f.write(example_script)
    
    print("\n📝 Created test_memory_example.py")
    print("💡 Run with: python test_memory_example.py")

def main():
    """Main configuration setup"""
    print("🚀 Starting Mem0AI Configuration Setup")
    
    # Step 1: Environment setup
    create_env_file()
    
    # Step 2: Test configuration
    if test_configuration():
        print("\n🎉 Configuration successful!")
        
        # Step 3: Create example usage
        create_usage_example()
        
        print("\n📋 Next Steps:")
        print("1. Run: python test_memory_example.py")
        print("2. Use the configured mem0_config.py for advanced operations")
        print("3. Import and use in your applications")
        
    else:
        print("\n⚠️  Configuration needs attention")
        print("💡 Please check the issues above and try again")

if __name__ == "__main__":
    main() 