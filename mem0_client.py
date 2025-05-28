import os

from mem0 import MemoryClient

# Load API key from environment variable for security
api_key = os.getenv("MEM0_API_KEY")

if not api_key:
    raise ValueError(
        "MEM0_API_KEY environment variable is not set. "
        "Please set it with your Mem0 API key before running this script. "
        "You can set it by running: export MEM0_API_KEY='your_api_key_here'"
    )

try:
    client = MemoryClient(api_key=api_key)
    print(
        "MemoryClient initialized successfully. This client interacts with the Mem0 cloud platform."
    )
except Exception as e:
    print(f"Failed to initialize MemoryClient: {e}")
    print(
        "Please verify your MEM0_API_KEY is valid and your internet connection is working."
    )
    raise

# IMPORTANT: This script initializes a client to the Mem0 cloud service.
# It does NOT host a local service that the AI's MCP tools connect to.
# Both this script (when you run it) and the AI's MCP tools are clients
# of the Mem0 cloud platform.
#
# To use this script for your own interactions with Mem0, you would add
# calls like client.add(...), client.search(...), etc., after initialization.
# Running this script in tmux is useful if you want to keep this client active
# for your own prolonged use or for a custom application you build.

# Example of how you might use the client in this script:
# try:
#     messages = [
#         {"role": "user", "content": "This is a test memory from mem0.py script."}
#     ]
#     response = client.add(messages, user_id="script_tester")
#     print("Response from client.add:", response)
#
#     search_results = client.search("test memory", user_id="script_tester")
#     print("Response from client.search:", search_results)
#
# except Exception as e:
#     print(f"An error occurred: {e}")

# If you just want to initialize the client and have the script exit, that's fine.
# If you intend for this to be a long-running process for some other application logic
# you add, you would include that logic below (e.g., a web server, a loop, etc.).
# For the AI's MCP tools to work, the AI's own environment must be correctly
# configured to communicate with the Mem0 Platform.
