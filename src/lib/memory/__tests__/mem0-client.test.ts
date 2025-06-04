import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Mem0Client } from '../mem0-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('Mem0Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.MEM0_API_KEY;
    delete process.env.DEFAULT_USER_ID;
    delete process.env.DEFAULT_APP_ID;
    delete process.env.DEFAULT_AGENT_ID;
  });

  describe('constructor', () => {
    it('should initialize with default values when no config provided', () => {
      const client = new Mem0Client();
      const config = client.getConfig();

      expect(config.userId).toBe('default_user');
      expect(config.appId).toBe('pixelated');
      expect(config.agentId).toBe('pixelated_ai');
      expect(config.baseUrl).toBe('https://api.mem0.ai/v1');
    });

    it('should use provided config values', () => {
      const customConfig = {
        apiKey: 'test-key',
        userId: 'test-user',
        appId: 'test-app',
        agentId: 'test-agent',
        baseUrl: 'https://custom.api.com'
      };

      const client = new Mem0Client(customConfig);
      const config = client.getConfig();

      expect(config.apiKey).toBe('test-key');
      expect(config.userId).toBe('test-user');
      expect(config.appId).toBe('test-app');
      expect(config.agentId).toBe('test-agent');
      expect(config.baseUrl).toBe('https://custom.api.com');
    });

    it('should use environment variables when available', () => {
      process.env.MEM0_API_KEY = 'env-api-key';
      process.env.DEFAULT_USER_ID = 'env-user';
      process.env.DEFAULT_APP_ID = 'env-app';
      process.env.DEFAULT_AGENT_ID = 'env-agent';

      const client = new Mem0Client();
      const config = client.getConfig();

      expect(config.apiKey).toBe('env-api-key');
      expect(config.userId).toBe('env-user');
      expect(config.appId).toBe('env-app');
      expect(config.agentId).toBe('env-agent');
    });
  });

  describe('isConfigured', () => {
    it('should return false when no API key is provided', () => {
      const client = new Mem0Client();
      expect(client.isConfigured()).toBe(false);
    });

    it('should return true when API key is provided', () => {
      const client = new Mem0Client({ apiKey: 'test-key' });
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('addMemory', () => {
    it('should throw error when API key is missing', async () => {
      const client = new Mem0Client();
      
      await expect(client.addMemory('test memory')).rejects.toThrow(
        'Mem0 API key is required'
      );
    });

    it('should make correct API call with basic content', async () => {
      const mockResponse = { id: '123', data: { memory: 'test memory' }, event: 'ADD' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockResponse]
      });

      const client = new Mem0Client({ apiKey: 'test-key' });
      const result = await client.addMemory('test memory');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.mem0.ai/v1/memories/',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test memory' }],
            user_id: 'default_user',
            agent_id: 'pixelated_ai',
            app_id: 'pixelated'
          })
        })
      );

      expect(result).toEqual([mockResponse]);
    });

    it('should include optional parameters when provided', async () => {
      const mockResponse = { id: '123', data: { memory: 'test memory' }, event: 'ADD' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockResponse]
      });

      const client = new Mem0Client({ apiKey: 'test-key' });
      await client.addMemory('test memory', {
        userId: 'custom-user',
        metadata: { category: 'test' },
        categories: ['personal'],
        sessionId: 'session-123'
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.mem0.ai/v1/memories/',
        expect.objectContaining({
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test memory' }],
            user_id: 'custom-user',
            agent_id: 'pixelated_ai',
            app_id: 'pixelated',
            metadata: { category: 'test' },
            categories: ['personal'],
            session_id: 'session-123'
          })
        })
      );
    });
  });

  describe('searchMemories', () => {
    it('should make correct search API call', async () => {
      const mockResponse = [
        {
          id: '123',
          memory: 'test memory',
          user_id: 'default_user',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          score: 0.9
        }
      ];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const client = new Mem0Client({ apiKey: 'test-key' });
      const result = await client.searchMemories('test query');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.mem0.ai/v1/memories/search/?query=test+query&user_id=default_user&limit=10&agent_id=pixelated_ai&app_id=pixelated',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should include search options in query parameters', async () => {
      const mockResponse = [];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const client = new Mem0Client({ apiKey: 'test-key' });
      await client.searchMemories('test query', {
        userId: 'custom-user',
        limit: 5,
        threshold: 0.8,
        sessionId: 'session-123'
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('user_id=custom-user'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('threshold=0.8'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('session_id=session-123'),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      const client = new Mem0Client({ apiKey: 'invalid-key' });
      
      await expect(client.searchMemories('test')).rejects.toThrow(
        'Mem0 API error (401): Unauthorized'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const client = new Mem0Client({ apiKey: 'test-key' });
      
      await expect(client.searchMemories('test')).rejects.toThrow('Network error');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const client = new Mem0Client({ apiKey: 'test-key' });
      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection failed'));

      const client = new Mem0Client({ apiKey: 'test-key' });
      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });
}); 