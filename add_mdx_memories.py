#!/usr/bin/env python3
"""
Add memory about MDX fixes to mem0
"""
import os
from mem0 import MemoryClient

def add_mdx_fixes():
    api_key = os.getenv("MEM0_API_KEY")
    user_id = os.getenv("DEFAULT_USER_ID", "chadisfaction")
    
    if not api_key:
        print("MEM0_API_KEY environment variable is not set.")
        return
    
    try:
        client = MemoryClient(api_key=api_key)
        
        # Add memory about the MDX Frame issue and fix
        mdx_fix_memory = {
            "messages": [
                {
                    "role": "system", 
                    "content": "MDX build error resolution"
                },
                {
                    "role": "user", 
                    "content": "Fixed MDX Frame component syntax errors by ensuring proper closing tags and cleaning up special characters in ai-integration.mdx and architecture.mdx files. The issue was with unclosed Frame tags causing build failures."
                }
            ],
            "metadata": {
                "type": "fix",
                "category": "mdx",
                "files": ["ai-integration.mdx", "architecture.mdx"],
                "error_type": "unclosed_tags"
            }
        }
        
        result = client.add(
            messages=mdx_fix_memory["messages"],
            user_id=user_id,
            metadata=mdx_fix_memory["metadata"]
        )
        
        print(f"✅ Added MDX fix memory: {result}")
        
        # Also add memory about bias detection stub creation
        bias_fix_memory = {
            "messages": [
                {
                    "role": "system",
                    "content": "Bias detection build error resolution"
                },
                {
                    "role": "user",
                    "content": "Created stub implementations for missing bias detection modules: BiasDetectionEngine.ts, audit.ts, types.ts, utils.ts, cache.ts to resolve build errors. These are temporary stubs until the real bias detection files are provided."
                }
            ],
            "metadata": {
                "type": "fix", 
                "category": "build_error",
                "files": ["BiasDetectionEngine.ts", "audit.ts", "types.ts", "utils.ts", "cache.ts"],
                "location": "src/lib/ai/bias-detection/"
            }
        }
        
        result2 = client.add(
            messages=bias_fix_memory["messages"],
            user_id=user_id,
            metadata=bias_fix_memory["metadata"]
        )
        
        print(f"✅ Added bias detection fix memory: {result2}")
        
    except Exception as e:
        print(f"Error adding memories: {e}")

if __name__ == "__main__":
    add_mdx_fixes()
