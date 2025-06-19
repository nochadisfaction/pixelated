#!/usr/bin/env python3
"""
Improved memory logging script that automatically loads .env variables
Usage: python memory/mem0_logger.py "memory text to store"
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv
from mem0 import MemoryClient

# Load .env file from project root
project_root = Path(__file__).parent.parent
env_file = project_root / ".env"
load_dotenv(env_file)

def log_memory(memory_text: str, user_id: str = "pixelated_dev") -> bool:
    """Log memory to mem0ai platform"""
    api_key = os.getenv('MEM0_API_KEY')
    
    if not api_key:
        print("❌ MEM0_API_KEY not found in environment variables")
        return False
        
    try:
        client = MemoryClient(api_key=api_key)
        messages = [{'role': 'user', 'content': memory_text}]
        response = client.add(messages, user_id=user_id)
        
        print(f"✅ Memory logged to mem0ai for user '{user_id}':")
        for result in response.get('results', []):
            print(f"   - ID: {result['id']} | Event: {result['event']} | Memory: {result['memory']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error logging memory to mem0ai: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python memory/mem0_logger.py 'memory text to store'")
        sys.exit(1)
        
    memory_text = sys.argv[1]
    success = log_memory(memory_text)
    sys.exit(0 if success else 1) 