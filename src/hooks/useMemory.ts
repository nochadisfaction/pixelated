import { useState, useEffect, useCallback } from 'react';
import { clientMemoryService, type MemoryEntry, type SearchOptions, type MemoryStats } from '@/lib/memory/client-memory-service';

interface UseMemoryOptions {
  userId?: string;
  autoLoad?: boolean;
  category?: string;
}

interface UseMemoryReturn {
  memories: MemoryEntry[];
  isLoading: boolean;
  error: string | null;
  stats: MemoryStats | null;
  
  // Core operations
  addMemory: (content: string, metadata?: MemoryEntry['metadata']) => Promise<string>;
  searchMemories: (query: string, options?: Partial<SearchOptions>) => Promise<MemoryEntry[]>;
  updateMemory: (memoryId: string, content: string) => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<void>;
  refreshMemories: () => Promise<void>;
  
  // Convenience methods
  addUserPreference: (preference: string, value: any) => Promise<void>;
  addConversationContext: (context: string, sessionId?: string) => Promise<void>;
  addProjectInfo: (projectInfo: string, projectId?: string) => Promise<void>;
  
  // Search methods
  searchByCategory: (category: string) => Promise<MemoryEntry[]>;
  searchByTags: (tags: string[]) => Promise<MemoryEntry[]>;
  
  // Memory management
  clearMemories: () => void;
  getMemoryHistory: () => Promise<any[]>;
}

export function useMemory(options: UseMemoryOptions = {}): UseMemoryReturn {
  const { userId = 'default', autoLoad = true, category } = options;
  
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MemoryStats | null>(null);

  const handleError = useCallback((err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    setError(errorMessage);
    console.error('Memory operation error:', err);
  }, []);

  const refreshMemories = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      let fetchedMemories: MemoryEntry[];
      
      if (category) {
        fetchedMemories = await clientMemoryService.searchByCategory(category, userId);
      } else {
        fetchedMemories = await clientMemoryService.getAllMemories(userId);
      }
      
      setMemories(fetchedMemories);
      
      // Update stats
      const memoryStats = await clientMemoryService.getMemoryStats(userId);
      setStats(memoryStats);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, category, handleError]);

  const addMemory = useCallback(async (content: string, metadata?: MemoryEntry['metadata']): Promise<string> => {
    setError(null);
    
    try {
      const memoryId = await clientMemoryService.addMemory({
        content,
        metadata: {
          ...metadata,
          category: metadata?.category || category,
          userId,
        },
      }, userId);
      
      // Refresh memories to include the new one
      await refreshMemories();
      
      return memoryId;
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, [userId, category, refreshMemories, handleError]);

  const searchMemories = useCallback(async (query: string, searchOptions?: Partial<SearchOptions>): Promise<MemoryEntry[]> => {
    setError(null);
    
    try {
      const results = await clientMemoryService.searchMemories({
        query,
        userId,
        category,
        limit: 10,
        ...searchOptions,
      });
      
      return results;
    } catch (err) {
      handleError(err);
      return [];
    }
  }, [userId, category, handleError]);

  const updateMemory = useCallback(async (memoryId: string, content: string): Promise<void> => {
    setError(null);
    
    try {
      await clientMemoryService.updateMemory(memoryId, content, userId);
      await refreshMemories();
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, [userId, refreshMemories, handleError]);

  const deleteMemory = useCallback(async (memoryId: string): Promise<void> => {
    setError(null);
    
    try {
      await clientMemoryService.deleteMemory(memoryId, userId);
      await refreshMemories();
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, [userId, refreshMemories, handleError]);

  const addUserPreference = useCallback(async (preference: string, value: any): Promise<void> => {
    await clientMemoryService.addUserPreference(userId, preference, value);
    await refreshMemories();
  }, [userId, refreshMemories]);

  const addConversationContext = useCallback(async (context: string, sessionId?: string): Promise<void> => {
    await clientMemoryService.addConversationContext(userId, context, sessionId);
    await refreshMemories();
  }, [userId, refreshMemories]);

  const addProjectInfo = useCallback(async (projectInfo: string, projectId?: string): Promise<void> => {
    await clientMemoryService.addProjectInfo(userId, projectInfo, projectId);
    await refreshMemories();
  }, [userId, refreshMemories]);

  const searchByCategory = useCallback(async (searchCategory: string): Promise<MemoryEntry[]> => {
    try {
      return await clientMemoryService.searchByCategory(searchCategory, userId);
    } catch (err) {
      handleError(err);
      return [];
    }
  }, [userId, handleError]);

  const searchByTags = useCallback(async (tags: string[]): Promise<MemoryEntry[]> => {
    try {
      return await clientMemoryService.searchByTags(tags, userId);
    } catch (err) {
      handleError(err);
      return [];
    }
  }, [userId, handleError]);

  const clearMemories = useCallback(() => {
    setMemories([]);
    setStats(null);
    setError(null);
  }, []);

  const getMemoryHistory = useCallback(async (): Promise<any[]> => {
    try {
      return await clientMemoryService.getMemoryHistory(userId);
    } catch (err) {
      handleError(err);
      return [];
    }
  }, [userId, handleError]);

  // Auto-load memories on mount or when dependencies change
  useEffect(() => {
    if (autoLoad && userId) {
      refreshMemories();
    }
  }, [autoLoad, userId, refreshMemories]);

  return {
    memories,
    isLoading,
    error,
    stats,
    
    // Core operations
    addMemory,
    searchMemories,
    updateMemory,
    deleteMemory,
    refreshMemories,
    
    // Convenience methods
    addUserPreference,
    addConversationContext,
    addProjectInfo,
    
    // Search methods
    searchByCategory,
    searchByTags,
    
    // Memory management
    clearMemories,
    getMemoryHistory,
  };
}

// Hook for conversation memory management
export function useConversationMemory(userId: string, sessionId?: string) {
  const memory = useMemory({ 
    userId, 
    category: 'conversation',
    autoLoad: true 
  });

  const addMessage = useCallback(async (message: string, role: 'user' | 'assistant' = 'user') => {
    const content = `${role}: ${message}`;
    await memory.addMemory(content, {
      category: 'conversation',
      tags: ['chat-message', role],
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }, [memory, sessionId]);

  const getConversationHistory = useCallback(async () => {
    if (sessionId) {
      return memory.memories.filter(m => m.metadata?.sessionId === sessionId);
    }
    return memory.memories;
  }, [memory.memories, sessionId]);

  return {
    ...memory,
    addMessage,
    getConversationHistory,
  };
}

// Hook for user preferences memory
export function useUserPreferences(userId: string) {
  const memory = useMemory({ 
    userId, 
    category: 'preference',
    autoLoad: true 
  });

  const setPreference = useCallback(async (key: string, value: any) => {
    const existingPref = memory.memories.find(m => 
      m.content.includes(`User preference: ${key}`)
    );

    if (existingPref?.id) {
      await memory.updateMemory(existingPref.id, `User preference: ${key} = ${JSON.stringify(value)}`);
    } else {
      await memory.addUserPreference(key, value);
    }
  }, [memory]);

  const getPreference = useCallback((key: string): any => {
    const prefMemory = memory.memories.find(m => 
      m.content.includes(`User preference: ${key}`)
    );
    
    if (prefMemory) {
      try {
        const match = prefMemory.content.match(/= (.+)$/);
        return match ? JSON.parse(match[1]) : null;
      } catch {
        return null;
      }
    }
    
    return null;
  }, [memory.memories]);

  const removePreference = useCallback(async (key: string) => {
    const prefMemory = memory.memories.find(m => 
      m.content.includes(`User preference: ${key}`)
    );
    
    if (prefMemory?.id) {
      await memory.deleteMemory(prefMemory.id);
    }
  }, [memory]);

  return {
    ...memory,
    setPreference,
    getPreference,
    removePreference,
  };
} 