#!/usr/bin/env python3
"""
Test actual memory connection and retrieve existing memories
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

def test_memory_retrieval():
    """Test retrieving existing memories"""
    print("🔍 Testing Memory Retrieval")
    print("=" * 30)
    
    # Load environment
    load_env()
    
    try:
        from mem0 import MemoryClient
        
        api_key = os.getenv("MEM0_API_KEY")
        user_id = os.getenv("DEFAULT_USER_ID", "chadisfaction")
        
        print(f"👤 Using user ID: {user_id}")
        
        # Initialize client
        client = MemoryClient(api_key=api_key)
        print("✅ Client initialized")
        
        # Try to search for existing memories
        print("\n🔍 Searching for existing memories...")
        
        search_queries = [
            "default_user",
            "task",
            "project", 
            "backup",
            "pixelated",
            "chadisfaction",
            "recent"
        ]
        
        found_memories = False
        
        for query in search_queries:
            try:
                results = client.search(query, user_id=user_id, limit=3)
                if results:
                    print(f"\n📋 Results for '{query}':")
                    for i, memory in enumerate(results, 1):
                        print(f"  {i}. {memory}")
                    found_memories = True
            except Exception as e:
                print(f"⚠️  Search for '{query}' failed: {e}")
        
        if not found_memories:
            print("\n📝 No existing memories found. Let me try to add a test memory...")
            
            # Try adding a simple memory
            test_messages = [
                {"role": "user", "content": "Testing memory connection from mem0ai setup"},
                {"role": "assistant", "content": "Memory connection test successful"}
            ]
            
            result = client.add(test_messages, user_id=user_id)
            print(f"✅ Test memory added: {result}")
            
            # Try searching for it
            search_result = client.search("memory connection test", user_id=user_id)
            if search_result:
                print("✅ Test memory retrieved successfully!")
                print(f"Result: {search_result}")
            else:
                print("⚠️  Could not retrieve test memory")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    test_memory_retrieval() 