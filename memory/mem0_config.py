import os
from mem0ai import MemoryClient

# Load API key from environment variable
api_key = os.getenv("MEM0_API_KEY", "m0-CrQ3kFT1qb7ybwIhwJcUf23FCYFdZFStmxW9V8EY")
user_id = os.getenv("DEFAULT_USER_ID", "CHAD864")

# Initialize the client
client = MemoryClient(api_key=api_key)

# Memory base configuration
MEMORY_BASE = {
    "user_id": user_id,
    "max_results": 10,
    "similarity_threshold": 0.7,
    "include_metadata": True,
    "include_embeddings": False
}

# Example memory operations
def add_memory(messages, metadata=None):
    """Add a memory to the base"""
    try:
        response = client.add(
            messages=messages,
            user_id=MEMORY_BASE["user_id"],
            metadata=metadata
        )
        return response
    except Exception as e:
        print(f"Error adding memory: {e}")
        return None

def search_memory(query, limit=None):
    """Search memories in the base"""
    try:
        results = client.search(
            query=query,
            user_id=MEMORY_BASE["user_id"],
            limit=limit or MEMORY_BASE["max_results"]
        )
        return results
    except Exception as e:
        print(f"Error searching memory: {e}")
        return None

def get_memory(memory_id):
    """Get a specific memory by ID"""
    try:
        memory = client.get(memory_id=memory_id)
        return memory
    except Exception as e:
        print(f"Error getting memory: {e}")
        return None

def delete_memory(memory_id):
    """Delete a memory by ID"""
    try:
        response = client.delete(memory_id=memory_id)
        return response
    except Exception as e:
        print(f"Error deleting memory: {e}")
        return None

# Initialize memory base with some example data
def initialize_memory_base():
    """Initialize the memory base with some example data"""
    example_memories = [
        {
            "messages": [
                {"role": "system", "content": "Memory base initialized"},
                {"role": "user", "content": "This is the initial memory base setup"}
            ],
            "metadata": {"type": "system", "category": "initialization"}
        }
    ]
    
    for memory in example_memories:
        add_memory(memory["messages"], memory["metadata"])

if __name__ == "__main__":
    # Initialize the memory base when run directly
    initialize_memory_base()