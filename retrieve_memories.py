#!/usr/bin/env python3
"""
Retrieve existing memories from mem0ai
"""

import os
from pathlib import Path

def load_env_clean():
    """Load environment variables from .env file, cleaning quoted values"""
    env_path = Path('.env')
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#') and '=' in line:
                    key, value = line.strip().split('=', 1)
                    # Clean quoted values
                    if value.startswith('"') and value.endswith('"'):
                        value = value.strip('"')
                    os.environ[key] = value

def retrieve_memories():
    """Retrieve and display existing memories"""
    print("🧠 Retrieving Existing Memories")
    print("=" * 35)
    
    # Load clean environment
    load_env_clean()
    
    try:
        from mem0 import MemoryClient
        
        api_key = os.getenv("MEM0_API_KEY")
        user_id = os.getenv("DEFAULT_USER_ID", "chadisfaction")
        
        print(f"👤 User ID: {user_id}")
        print(f"🔑 API Key: {api_key[:8]}...{api_key[-4:]}")
        
        # Initialize client
        client = MemoryClient(api_key=api_key)
        print("✅ Client initialized successfully")
        
        # Search for various types of memories
        search_queries = [
            "default_user",
            "task list", 
            "backup security",
            "pixelated",
            "mental health",
            "project",
            "chadisfaction",
            "recommendation",
            "analysis"
        ]
        
        all_memories = []
        
        print("\n🔍 Searching for memories...")
        
        for query in search_queries:
            try:
                results = client.search(query, user_id=user_id, limit=5)
                if results:
                    print(f"\n📋 Found {len(results)} memories for '{query}':")
                    for i, memory in enumerate(results, 1):
                        print(f"  {i}. {str(memory)[:100]}...")
                        all_memories.append(memory)
                else:
                    print(f"  No results for '{query}'")
            except Exception as e:
                print(f"  ⚠️ Error searching '{query}': {e}")
        
        # Remove duplicates and summarize
        unique_memories = []
        seen = set()
        for memory in all_memories:
            memory_str = str(memory)
            if memory_str not in seen:
                unique_memories.append(memory)
                seen.add(memory_str)
        
        print(f"\n📊 Summary:")
        print(f"  Total unique memories found: {len(unique_memories)}")
        
        if unique_memories:
            print("\n🎯 Memory Summary:")
            for i, memory in enumerate(unique_memories[:10], 1):  # Show first 10
                print(f"  {i}. {str(memory)[:150]}...")
        
        return unique_memories
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

if __name__ == "__main__":
    memories = retrieve_memories()
    if memories:
        print(f"\n🎉 Successfully retrieved {len(memories)} memories!")
        print("💡 Memory functionality is now restored!")
    else:
        print("\n⚠️ No memories found or connection issues persist.") 