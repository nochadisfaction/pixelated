// Client-side memory service that communicates with API endpoints
export interface MemoryEntry {
  id?: string;
  content: string;
  metadata?: {
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

class ClientMemoryService {
  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`/api/memory${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Memory API error: ${response.statusText}`);
    }

    return response.json();
  }

  async addMemory(entry: MemoryEntry, userId: string = 'default'): Promise<string> {
    const result = await this.apiCall('/add', {
      method: 'POST',
      body: JSON.stringify({ entry, userId }),
    });
    return result.memoryId;
  }

  async searchMemories(options: SearchOptions): Promise<MemoryEntry[]> {
    const result = await this.apiCall('/search', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return result.memories;
  }

  async getAllMemories(userId: string = 'default'): Promise<MemoryEntry[]> {
    const result = await this.apiCall(`/all?userId=${encodeURIComponent(userId)}`);
    return result.memories;
  }

  async updateMemory(memoryId: string, content: string, userId: string = 'default'): Promise<void> {
    await this.apiCall('/update', {
      method: 'PUT',
      body: JSON.stringify({ memoryId, content, userId }),
    });
  }

  async deleteMemory(memoryId: string, userId: string = 'default'): Promise<void> {
    await this.apiCall('/delete', {
      method: 'DELETE',
      body: JSON.stringify({ memoryId, userId }),
    });
  }

  async getMemoryHistory(userId: string = 'default'): Promise<any[]> {
    const result = await this.apiCall(`/history?userId=${encodeURIComponent(userId)}`);
    return result.history;
  }

  async getMemoryStats(userId?: string): Promise<MemoryStats> {
    const params = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const result = await this.apiCall(`/stats${params}`);
    return result.stats;
  }

  async addUserPreference(userId: string, preference: string, value: any): Promise<void> {
    await this.apiCall('/preference', {
      method: 'POST',
      body: JSON.stringify({ userId, preference, value }),
    });
  }

  async addConversationContext(userId: string, context: string, sessionId?: string): Promise<void> {
    await this.apiCall('/conversation-context', {
      method: 'POST',
      body: JSON.stringify({ userId, context, sessionId }),
    });
  }

  async addProjectInfo(userId: string, projectInfo: string, projectId?: string): Promise<void> {
    await this.apiCall('/project-info', {
      method: 'POST',
      body: JSON.stringify({ userId, projectInfo, projectId }),
    });
  }

  async searchByCategory(category: string, userId: string = 'default'): Promise<MemoryEntry[]> {
    const result = await this.apiCall(`/search-category?category=${encodeURIComponent(category)}&userId=${encodeURIComponent(userId)}`);
    return result.memories;
  }

  async searchByTags(tags: string[], userId: string = 'default'): Promise<MemoryEntry[]> {
    const result = await this.apiCall('/search-tags', {
      method: 'POST',
      body: JSON.stringify({ tags, userId }),
    });
    return result.memories;
  }
}

export const clientMemoryService = new ClientMemoryService(); 