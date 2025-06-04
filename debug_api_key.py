#!/usr/bin/env python3
"""
Debug API key formatting issues
"""

import os
from pathlib import Path

def debug_api_key():
    """Debug the API key formatting"""
    print("🔧 Debugging API Key")
    print("=" * 20)
    
    env_path = Path('.env')
    if env_path.exists():
        print("📁 Found .env file")
        with open(env_path, 'r') as f:
            for line_num, line in enumerate(f, 1):
                if 'MEM0_API_KEY' in line:
                    print(f"\nLine {line_num}: {repr(line)}")
                    
                    if '=' in line:
                        key, value = line.strip().split('=', 1)
                        print(f"Key: {repr(key)}")
                        print(f"Raw value: {repr(value)}")
                        print(f"Value length: {len(value)}")
                        
                        # Check for quotes and strip them
                        clean_value = value
                        if value.startswith('"') and value.endswith('"'):
                            clean_value = value.strip('"')
                            print(f"Stripped quotes: {repr(clean_value)}")
                        
                        # Set the clean value and test
                        os.environ['MEM0_API_KEY'] = clean_value
                        
                        # Test the connection with cleaned key
                        try:
                            from mem0 import MemoryClient
                            client = MemoryClient(api_key=clean_value)
                            print("✅ Client initialization successful with cleaned key!")
                            
                            # Try a simple operation
                            try:
                                result = client.search("test", user_id="chadisfaction", limit=1)
                                print("✅ API call successful!")
                                print(f"Search result: {result}")
                                return True
                            except Exception as e:
                                print(f"❌ API call failed: {e}")
                                return False
                                
                        except Exception as e:
                            print(f"❌ Client initialization failed: {e}")
                            return False
                    break
    else:
        print("❌ No .env file found")
        return False

if __name__ == "__main__":
    debug_api_key() 