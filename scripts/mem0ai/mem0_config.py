import os

from mem0ai import MemoryClient

# Load API key from environment variable (no default, must be set)
api_key = os.getenv("MEM0_API_KEY")
if not api_key:
    raise ValueError("MEM0_API_KEY environment variable is not set.")
user_id = os.getenv("DEFAULT_USER_ID", "chadisfaction")

# Initialize the client
client = MemoryClient(api_key=api_key)

# Memory base configuration
MEMORY_BASE = {
    "user_id": "chadisfaction",
    "max_results": 10,
    "similarity_threshold": 0.7,
    "include_metadata": True,
    "include_embeddings": False,
}


# Example memory operations
def add_memory(messages, metadata=None):
    """Add a memory to the base"""
    try:
        return client.add(
            messages=messages,
            user_id=MEMORY_BASE["user_id"],
            metadata=metadata,
        )
    except Exception as e:
        print(f"Error adding memory: {e}")
        return None


def search_memory(query, limit=None):
    """Search memories in the base"""
    try:
        return client.search(
            query=query,
            user_id=MEMORY_BASE["user_id"],
            limit=limit or MEMORY_BASE["max_results"],
        )
    except Exception as e:
        print(f"Error searching memory: {e}")
        return None


def get_memory(memory_id):
    """Get a specific memory by ID"""
    try:
        return client.get(memory_id=memory_id)
    except Exception as e:
        print(f"Error getting memory: {e}")
        return None


def delete_memory(memory_id):
    """Delete a memory by ID"""
    try:
        return client.delete(memory_id=memory_id)
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
                {"role": "user", "content": "This is the initial memory base setup"},
            ],
            "metadata": {"type": "system", "category": "initialization"},
        }
    ]

    for memory in example_memories:
        add_memory(memory["messages"], memory["metadata"])


def demo_search():
    """Demo: Search the memory bank and print results"""
    query = "initial memory base setup"
    results = search_memory(query)
    print(f"Search results for query '{query}':")
    if results:
        for i, res in enumerate(results, 1):
            print(f"{i}. {res}")
    else:
        print("No results found.")


def summarize_relevant_memories():
    """Search and print a summary of the most relevant memories for the current session."""
    # You can adjust the query to focus on session, goals, preferences, or recent events
    queries = [
        "session",
        "goal",
        "preference",
        "important decision",
        "project context",
        "user instruction",
        "AI learning",
        "memory bank",
    ]
    print("\n--- Session Memory Summary ---")
    found_any = False
    for query in queries:
        if results := search_memory(query, limit=3):
            print(f"\nTop results for '{query}':")
            for i, res in enumerate(results, 1):
                # Try to extract a readable summary from the memory object
                content = None
                if isinstance(res, dict):
                    # Try common keys
                    content = res.get("content") or res.get("memory")
                    if (
                        not content
                        and "messages" in res
                        and isinstance(res["messages"], list)
                    ):
                        content = ", ".join(
                            m.get("content", "")
                            for m in res["messages"]
                            if "content" in m
                        )
                if not content:
                    content = str(res)
                print(f"  {i}. {content[:200]}")
            found_any = True
    if not found_any:
        print("No relevant memories found.")
    print("--- End of Summary ---\n")


def log_session_memory(insight):
    """Log a new memory about this session or insight."""
    messages = [
        {"role": "system", "content": "Session insight"},
        {"role": "ai", "content": insight},
    ]
    metadata = {"type": "session", "category": "ai-insight"}
    add_memory(messages, metadata)
    print("Logged new session insight to memory.")


if __name__ == "__main__":
    # Initialize the memory base when run directly
    initialize_memory_base()
    summarize_relevant_memories()
    # Example: log a new session insight
    log_session_memory(
        "AI agent is now configured to proactively use the memory bank for every interaction."
    )
