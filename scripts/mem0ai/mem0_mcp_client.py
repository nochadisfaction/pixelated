#!/usr/bin/env python3
import json

import requests

# MCP Server URL
BASE_URL = "http://localhost:8000"


def print_response(response):
    """Print formatted response from the server"""
    try:
        print(json.dumps(response.json(), indent=2))
    except json.JSONDecodeError:
        print(response.text)


def add_memory():
    """Add a new memory to the mem0 database"""
    data = {
        "messages": [
            {
                "role": "user",
                "content": "This is a test memory added via the MCP server.",
            }
        ],
        "user_id": "test_user",
        "metadata": {"source": "mcp_client", "tags": ["test"]},
    }

    response = requests.post(f"{BASE_URL}/memory", json=data, timeout=(5, 30))
    print(f"Add Memory Response (Status: {response.status_code}):")
    print_response(response)

    return response.json()["data"]["memory_id"] if response.status_code == 201 else None


def search_memories(query):
    """Search for memories"""
    response = requests.get(
        f"{BASE_URL}/search?q={query}&user_id=test_user", timeout=(5, 30)
    )
    print(f"Search Response (Status: {response.status_code}):")
    print_response(response)


def get_memory(memory_id):
    """Get a specific memory by ID"""
    response = requests.get(f"{BASE_URL}/memory/{memory_id}", timeout=(5, 30))
    print(f"Get Memory Response (Status: {response.status_code}):")
    print_response(response)


def delete_memory(memory_id):
    """Delete a specific memory by ID"""
    response = requests.delete(f"{BASE_URL}/memory/{memory_id}", timeout=(5, 30))
    print(f"Delete Memory Response (Status: {response.status_code}):")
    print_response(response)


def main():
    print("=== MCP Server Client Demo ===")

    # Add a memory
    print("\n1. Adding a new memory...")
    memory_id = add_memory()

    if not memory_id:
        print("Failed to add memory. Exiting.")
        return

    # Search for memories
    print("\n2. Searching for memories with query 'test'...")
    search_memories("test")

    # Get a specific memory
    print(f"\n3. Getting memory with ID: {memory_id}...")
    get_memory(memory_id)

    # Delete the memory
    print(f"\n4. Deleting memory with ID: {memory_id}...")
    delete_memory(memory_id)

    print("\nDemo completed.")


if __name__ == "__main__":
    main()
