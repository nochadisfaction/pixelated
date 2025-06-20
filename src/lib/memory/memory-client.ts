export interface MemoryEntry {
  id?: string;
  content: string;
  metadata?: {
    role: string;
    role: string;
    timestamp?: string;
    category?: string;
    importance?: number;
    tags?: string[];
    userId?: string;
    sessionId?: string;
  };
}

export interface SearchOptions {
  query: string;
  userId?: string;
  category?: string;
  limit?: number;
  threshold?: number;
}

export interface MemoryStats {
  totalMemories: number;
  categoryCounts: Record<string, number>;
  recentActivity: Array<{
    timestamp: string;
    action: 'add' | 'search' | 'update' | 'delete';
    userId?: string;
  }>;
}

class MemoryClientManager {
  private baseUrl = '/api/memory';

  async addMemory(entry: MemoryEntry, userId: string = 'default'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entry, userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add memory: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  async searchMemories(options: SearchOptions): Promise<MemoryEntry[]> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Failed to search memories: ${response.statusText}`);
    }

    const result = await response.json();
    return result.memories;
  }

  async getAllMemories(userId: string = 'default'): Promise<MemoryEntry[]> {
    const response = await fetch(`${this.baseUrl}/all?userId=${userId}`);

    if (!response.ok) {
      throw new Error(`Failed to get memories: ${response.statusText}`);
    }

    const result = await response.json();
    return result.memories;
  }

  async updateMemory(memoryId: string, content: string, userId: string = 'default'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memoryId, content, userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update memory: ${response.statusText}`);
    }
  }

  async deleteMemory(memoryId: string, userId: string = 'default'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memoryId, userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete memory: ${response.statusText}`);
    }
  }

  async getMemoryHistory(userId: string = 'default'): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/history?userId=${userId}`);

    if (!response.ok) {
      throw new Error(`Failed to get memory history: ${response.statusText}`);
    }

    const result = await response.json();
    return result.history;
  }

  async getMemoryStats(userId?: string): Promise<MemoryStats> {
    const url = userId 
      ? `${this.baseUrl}/stats?userId=${userId}`
      : `${this.baseUrl}/stats`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get memory stats: ${response.statusText}`);
    }

    const result = await response.json();
    return result.stats;
  }

  async addUserPreference(userId: string, preference: string, value: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, preference, value }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add user preference: ${response.statusText}`);
    }
  }

  async addConversationContext(userId: string, context: string, sessionId?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, context, sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add conversation context: ${response.statusText}`);
    }
  }

  async addProjectInfo(userId: string, projectInfo: string, projectId?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, projectInfo, projectId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add project info: ${response.statusText}`);
    }
  }

  async searchByCategory(category: string, userId: string = 'default'): Promise<MemoryEntry[]> {
    const response = await fetch(`${this.baseUrl}/search/category`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ category, userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search by category: ${response.statusText}`);
    }

    const result = await response.json();
    return result.memories;
  }

  async searchByTags(tags: string[], userId: string = 'default'): Promise<MemoryEntry[]> {
    const response = await fetch(`${this.baseUrl}/search/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags, userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search by tags: ${response.statusText}`);
    }

    const result = await response.json();
    return result.memories;
  }
}

// Export a singleton instance
export const memoryManager = new MemoryClientManager();
export { MemoryClientManager }; 