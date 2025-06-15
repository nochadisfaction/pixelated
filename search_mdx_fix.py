#!/usr/bin/env python3
"""
Search mem0 memories for MDX-related fixes and information
"""
import os
import sys
from mem0 import MemoryClient

def search_mdx_fix():
    # Load API key from environment variable
    api_key = os.getenv("MEM0_API_KEY")
    user_id = os.getenv("DEFAULT_USER_ID", "chadisfaction")
    
    if not api_key:
        print("MEM0_API_KEY environment variable is not set.")
        print("Please set it with: export MEM0_API_KEY='your_api_key_here'")
        return None
    
    try:
        client = MemoryClient(api_key=api_key)
        print("✓ MemoryClient initialized successfully")
        
        # Search for MDX-related memories
        search_queries = [
            "MDX Steps component fix",
            "redis-testing.mdx Steps closing tag",
            "MDX syntax error Steps",
            "Steps component closing tag issue",
            "MDX build error fix"
        ]
        
        for query in search_queries:
            print(f"\n🔍 Searching for: '{query}'")
            try:
                results = client.search(
                    query=query,
                    user_id=user_id,
                    limit=5
                )
                
                if results and len(results) > 0:
                    print(f"Found {len(results)} results:")
                    for i, result in enumerate(results, 1):
                        print(f"\n--- Result {i} ---")
                        print(f"ID: {result.get('id', 'N/A')}")
                        print(f"Memory: {result.get('memory', 'N/A')}")
                        print(f"Score: {result.get('score', 'N/A')}")
                        if 'metadata' in result:
                            print(f"Metadata: {result['metadata']}")
                else:
                    print("No results found")
                    
            except Exception as e:
                print(f"Error searching for '{query}': {e}")
        
        return client
        
    except Exception as e:
        print(f"Failed to initialize MemoryClient: {e}")
        return None

if __name__ == "__main__":
    client = search_mdx_fix()
    if client:
        print("\n✅ Search completed successfully")
    else:
        print("\n❌ Search failed")
        sys.exit(1)
