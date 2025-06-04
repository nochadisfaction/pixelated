/**
 * Mem0 Client for TypeScript/JavaScript applications
 * Provides a clean interface to the Mem0 memory service
 */

export interface Mem0Memory {
  id: string;
  memory: string;
  user_id: string;
  metadata?: Record<string, any>;
  categories?: string[];
  created_at: string;
  updated_at: string;
  score?: number;
}

export interface Mem0AddResponse {
  id: string;
  data: {
    memory: string;
  };
  event: string;
}

export interface Mem0Config {
  apiKey?: string;
  userId?: string;
  appId?: string;
  agentId?: string;
  baseUrl?: string;
}

export interface AddMemoryOptions {
  userId?: string;
  agentId?: string;
  appId?: string;
  metadata?: Record<string, any>;
  categories?: string[];
  sessionId?: string;
  filters?: Record<string, any>;
}

export interface SearchMemoryOptions {
  userId?: string;
  agentId?: string;
  appId?: string;
  limit?: number;
  threshold?: number;
  sessionId?: string;
  filters?: Record<string, any>;
}

export class Mem0Client {
  private config: Required<Mem0Config>;
  private baseUrl: string;

  constructor(config: Mem0Config = {}) {
    // Load from environment variables with fallbacks
    this.config = {
      apiKey: config.apiKey || this.getEnvVar('MEM0_API_KEY') || '',
      userId: config.userId || this.getEnvVar('DEFAULT_USER_ID') || 'default_user',
      appId: config.appId || this.getEnvVar('DEFAULT_APP_ID') || 'pixelated',
      agentId: config.agentId || this.getEnvVar('DEFAULT_AGENT_ID') || 'pixelated_ai',
      baseUrl: config.baseUrl || 'https://api.mem0.ai/v1'
    };

    this.baseUrl = this.config.baseUrl;

    if (!this.config.apiKey) {
      console.warn('⚠️  Mem0 API key not provided. Set MEM0_API_KEY environment variable or pass apiKey to constructor.');
    }
  }

  private getEnvVar(key: string): string | undefined {
    // Handle different environments (Node.js, browser, etc.)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    
    // Fallback for browser environments
    if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) {
      return (globalThis as any).process.env[key];
    }
    
    return undefined;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Mem0 API key is required. Set MEM0_API_KEY environment variable or provide apiKey in constructor.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mem0 API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Mem0 API request failed:', error);
      throw error;
    }
  }

  /**
   * Add a memory to the store
   */
  async addMemory(content: string, options: AddMemoryOptions = {}): Promise<Mem0AddResponse[]> {
    const {
      userId = this.config.userId,
      agentId = this.config.agentId,
      appId = this.config.appId,
      metadata,
      categories,
      sessionId,
      filters
    } = options;

    const messages = [{ role: 'user', content }];

    const body: any = {
      messages,
      user_id: userId
    };

    // Add optional parameters
    if (agentId) {
      body.agent_id = agentId;
    }
    if (appId) {
      body.app_id = appId;
    }
    if (metadata) {
      body.metadata = metadata;
    }
    if (categories) {
      body.categories = categories;
    }
    if (sessionId) {
      body.session_id = sessionId;
    }
    if (filters) {
      body.filters = filters;
    }

    return this.makeRequest('/memories/', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Search for memories
   */
  async searchMemories(query: string, options: SearchMemoryOptions = {}): Promise<Mem0Memory[]> {
    const {
      userId = this.config.userId,
      agentId = this.config.agentId,
      appId = this.config.appId,
      limit = 10,
      threshold,
      sessionId,
      filters
    } = options;

    const params = new URLSearchParams({
      query,
      user_id: userId,
      limit: limit.toString()
    });

    if (agentId) {
      params.append('agent_id', agentId);
    }
    if (appId) {
      params.append('app_id', appId);
    }
    if (threshold !== undefined) {
      params.append('threshold', threshold.toString());
    }
    if (sessionId) {
      params.append('session_id', sessionId);
    }
    if (filters) {
      params.append('filters', JSON.stringify(filters));
    }

    return this.makeRequest(`/memories/search/?${params.toString()}`);
  }

  /**
   * Get all memories for a user
   */
  async getAllMemories(userId?: string, agentId?: string, appId?: string): Promise<Mem0Memory[]> {
    const params = new URLSearchParams({
      user_id: userId || this.config.userId
    });

    if (agentId) {
      params.append('agent_id', agentId);
    }
    if (appId) {
      params.append('app_id', appId);
    }

    return this.makeRequest(`/memories/?${params.toString()}`);
  }

  /**
   * Update a memory
   */
  async updateMemory(memoryId: string, content: string, userId?: string): Promise<Mem0AddResponse> {
    const body = {
      data: content,
      user_id: userId || this.config.userId
    };

    return this.makeRequest(`/memories/${memoryId}/`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId: string, userId?: string): Promise<{ message: string }> {
    const params = new URLSearchParams({
      user_id: userId || this.config.userId
    });

    return this.makeRequest(`/memories/${memoryId}/?${params.toString()}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get memory history
   */
  async getMemoryHistory(userId?: string): Promise<any[]> {
    const params = new URLSearchParams({
      user_id: userId || this.config.userId
    });

    return this.makeRequest(`/memories/history/?${params.toString()}`);
  }

  /**
   * Test the connection to Mem0
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try a simple search to test the connection
      await this.searchMemories('test', { limit: 1 });
      return true;
    } catch (error) {
      console.error('Mem0 connection test failed:', error);
      return false;
    }
  }

  /**
   * Get client configuration
   */
  getConfig(): Mem0Config {
    return { ...this.config };
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }
} 