#!/usr/bin/env python3
"""
Search for memories using the original CHAD864 user ID
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

def search_original_memories():
    """Search for memories using the original CHAD864 user ID"""
    print("🧠 Searching Original Memories (CHAD864)")
    print("=" * 40)
    
    # Load clean environment
    load_env_clean()
    
    try:
        from mem0 import MemoryClient
        
        api_key = os.getenv("MEM0_API_KEY")
        original_user_id = "CHAD864"  # Original user ID from mem0_config.py
        current_user_id = os.getenv("DEFAULT_USER_ID", "chadisfaction")
        
        print(f"🔍 Searching with original user ID: {original_user_id}")
        print(f"📋 Current user ID in .env: {current_user_id}")
        
        # Initialize client
        client = MemoryClient(api_key=api_key)
        print("✅ Client initialized successfully")
        
        # Search with original user ID
        search_queries = [
            "task list recommendation",
            "backup security plan", 
            "pixelated mental health",
            "default_user",
            "project analysis",
            "session",
            "AI learning",
            "memory bank",
            "initial memory base setup"
        ]
        
        all_memories = []
        
        print(f"\n🔍 Searching memories for user '{original_user_id}'...")
        
        for query in search_queries:
            try:
                results = client.search(query, user_id=original_user_id, limit=5)
                if results:
                    print(f"\n📋 Found {len(results)} memories for '{query}':")
                    for i, memory in enumerate(results, 1):
                        print(f"  {i}. {str(memory)[:150]}...")
                        all_memories.append(memory)
                else:
                    print(f"  No results for '{query}'")
            except Exception as e:
                print(f"  ⚠️ Error searching '{query}': {e}")
        
        # Also try current user ID for comparison
        print(f"\n🔍 Also checking current user ID '{current_user_id}' for comparison...")
        
        for query in ["session", "project", "recent"]:
            try:
                results = client.search(query, user_id=current_user_id, limit=3)
                if results:
                    print(f"  Found {len(results)} memories for '{query}' under '{current_user_id}'")
                    all_memories.extend(results)
            except Exception as e:
                print(f"  Error: {e}")
        
        # Remove duplicates
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
            print("\n🎯 Retrieved Memories:")
            for i, memory in enumerate(unique_memories[:10], 1):
                print(f"  {i}. {str(memory)[:200]}...")
            
            # Suggest updating user ID
            if any("CHAD864" in str(m) for m in unique_memories):
                print(f"\n💡 Recommendation:")
                print(f"  Memories found under '{original_user_id}'")
                print(f"  Consider updating .env to use: DEFAULT_USER_ID={original_user_id}")
        
        return unique_memories, original_user_id
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return [], None

if __name__ == "__main__":
    memories, user_id = search_original_memories()
    if memories:
        print(f"\n🎉 Successfully found {len(memories)} memories!")
        print("💡 Memory functionality can now be restored!")
    else:
        print("\n⚠️ No memories found under either user ID.") 