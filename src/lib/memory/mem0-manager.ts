import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

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

export class Mem0Manager {
  private pythonPath: string;
  private scriptPath: string;
  private isInitialized = false;

  constructor() {
    this.pythonPath = 'python';
    this.scriptPath = path.join(process.cwd(), 'scripts', 'mem0_bridge.py');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create the Python bridge script if it doesn't exist
      await this.ensurePythonBridge();
      
      // Test the connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('Mem0Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mem0Manager:', error);
      throw error;
    }
  }

  private async ensurePythonBridge(): Promise<void> {
    const scriptsDir = path.join(process.cwd(), 'scripts');
    
    try {
      await fs.access(scriptsDir);
    } catch {
      await fs.mkdir(scriptsDir, { recursive: true });
    }

    const bridgeScript = `#!/usr/bin/env python3
import os
import sys
import json
import logging
from typing import Dict, List, Optional, Any
from mem0 import MemoryClient

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Mem0Bridge:
    def __init__(self):
        self.api_key = os.getenv("MEM0_API_KEY")
        if not self.api_key:
            raise ValueError("MEM0_API_KEY environment variable is not set")
        
        try:
            self.client = MemoryClient(api_key=self.api_key)
            logger.info("Mem0Bridge initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize MemoryClient: {e}")
            raise

    def add_memory(self, content: str, user_id: str = "default", metadata: Optional[Dict] = None) -> Dict:
        """Add a memory to the store"""
        try:
            messages = [{"role": "user", "content": content}]
            
            # Add metadata if provided
            kwargs = {"user_id": user_id}
            if metadata:
                kwargs.update(metadata)
            
            response = self.client.add(messages, **kwargs)
            logger.info(f"Memory added successfully for user {user_id}")
            return {"success": True, "response": response}
        except Exception as e:
            logger.error(f"Error adding memory: {e}")
            return {"success": False, "error": str(e)}

    def search_memories(self, query: str, user_id: str = "default", limit: int = 10) -> Dict:
        """Search for memories"""
        try:
            results = self.client.search(query, user_id=user_id, limit=limit)
            logger.info(f"Search completed for user {user_id}, found {len(results)} results")
            return {"success": True, "results": results}
        except Exception as e:
            logger.error(f"Error searching memories: {e}")
            return {"success": False, "error": str(e)}

    def get_all_memories(self, user_id: str = "default") -> Dict:
        """Get all memories for a user"""
        try:
            memories = self.client.get_all(user_id=user_id)
            logger.info(f"Retrieved {len(memories)} memories for user {user_id}")
            return {"success": True, "memories": memories}
        except Exception as e:
            logger.error(f"Error getting all memories: {e}")
            return {"success": False, "error": str(e)}

    def update_memory(self, memory_id: str, content: str, user_id: str = "default") -> Dict:
        """Update an existing memory"""
        try:
            response = self.client.update(memory_id, content, user_id=user_id)
            logger.info(f"Memory {memory_id} updated successfully for user {user_id}")
            return {"success": True, "response": response}
        except Exception as e:
            logger.error(f"Error updating memory: {e}")
            return {"success": False, "error": str(e)}

    def delete_memory(self, memory_id: str, user_id: str = "default") -> Dict:
        """Delete a memory"""
        try:
            response = self.client.delete(memory_id, user_id=user_id)
            logger.info(f"Memory {memory_id} deleted successfully for user {user_id}")
            return {"success": True, "response": response}
        except Exception as e:
            logger.error(f"Error deleting memory: {e}")
            return {"success": False, "error": str(e)}

    def get_memory_history(self, user_id: str = "default") -> Dict:
        """Get memory history for a user"""
        try:
            history = self.client.history(user_id=user_id)
            logger.info(f"Retrieved memory history for user {user_id}")
            return {"success": True, "history": history}
        except Exception as e:
            logger.error(f"Error getting memory history: {e}")
            return {"success": False, "error": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No command provided"}))
        sys.exit(1)

    try:
        bridge = Mem0Bridge()
        command = sys.argv[1]
        
        if command == "test":
            print(json.dumps({"success": True, "message": "Connection successful"}))
        
        elif command == "add":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "error": "Usage: add <content> <user_id> [metadata_json]"}))
                sys.exit(1)
            
            content = sys.argv[2]
            user_id = sys.argv[3]
            metadata = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
            
            result = bridge.add_memory(content, user_id, metadata)
            print(json.dumps(result))
        
        elif command == "search":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "error": "Usage: search <query> <user_id> [limit]"}))
                sys.exit(1)
            
            query = sys.argv[2]
            user_id = sys.argv[3]
            limit = int(sys.argv[4]) if len(sys.argv) > 4 else 10
            
            result = bridge.search_memories(query, user_id, limit)
            print(json.dumps(result))
        
        elif command == "get_all":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Usage: get_all <user_id>"}))
                sys.exit(1)
            
            user_id = sys.argv[2]
            result = bridge.get_all_memories(user_id)
            print(json.dumps(result))
        
        elif command == "update":
            if len(sys.argv) < 5:
                print(json.dumps({"success": False, "error": "Usage: update <memory_id> <content> <user_id>"}))
                sys.exit(1)
            
            memory_id = sys.argv[2]
            content = sys.argv[3]
            user_id = sys.argv[4]
            
            result = bridge.update_memory(memory_id, content, user_id)
            print(json.dumps(result))
        
        elif command == "delete":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "error": "Usage: delete <memory_id> <user_id>"}))
                sys.exit(1)
            
            memory_id = sys.argv[2]
            user_id = sys.argv[3]
            
            result = bridge.delete_memory(memory_id, user_id)
            print(json.dumps(result))
        
        elif command == "history":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Usage: history <user_id>"}))
                sys.exit(1)
            
            user_id = sys.argv[2]
            result = bridge.get_memory_history(user_id)
            print(json.dumps(result))
        
        else:
            print(json.dumps({"success": False, "error": f"Unknown command: {command}"}))
            sys.exit(1)
    
    except Exception as e:
        logger.error(f"Bridge error: {e}")
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
`;

    await fs.writeFile(this.scriptPath, bridgeScript);
    console.log('Python bridge script created successfully');
  }

  private async testConnection(): Promise<void> {
    const result = await this.executePythonCommand('test');
    if (!result.success) {
      throw new Error(`Connection test failed: ${result.error}`);
    }
  }

  private async executePythonCommand(command: string, ...args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonArgs = [this.scriptPath, command, ...args];
      const pythonProcess = spawn(this.pythonPath, pythonArgs);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  async addMemory(entry: MemoryEntry, userId: string = 'default'): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const metadata = {
      timestamp: new Date().toISOString(),
      ...entry.metadata,
    };

    const result = await this.executePythonCommand(
      'add',
      entry.content,
      userId,
      JSON.stringify(metadata)
    );

    if (!result.success) {
      throw new Error(`Failed to add memory: ${result.error}`);
    }

    return result.response.id || 'unknown';
  }

  async searchMemories(options: SearchOptions): Promise<MemoryEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { query, userId = 'default', limit = 10 } = options;

    const result = await this.executePythonCommand('search', query, userId, limit.toString());

    if (!result.success) {
      throw new Error(`Failed to search memories: ${result.error}`);
    }

    return result.results.map((item: any) => ({
      id: item.id,
      content: item.memory,
      metadata: {
        timestamp: item.created_at,
        importance: item.score,
        userId: item.user_id,
        ...item.metadata,
      },
    }));
  }

  async getAllMemories(userId: string = 'default'): Promise<MemoryEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = await this.executePythonCommand('get_all', userId);

    if (!result.success) {
      throw new Error(`Failed to get all memories: ${result.error}`);
    }

    return result.memories.map((item: any) => ({
      id: item.id,
      content: item.memory,
      metadata: {
        timestamp: item.created_at,
        userId: item.user_id,
        ...item.metadata,
      },
    }));
  }

  async updateMemory(memoryId: string, content: string, userId: string = 'default'): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = await this.executePythonCommand('update', memoryId, content, userId);

    if (!result.success) {
      throw new Error(`Failed to update memory: ${result.error}`);
    }
  }

  async deleteMemory(memoryId: string, userId: string = 'default'): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = await this.executePythonCommand('delete', memoryId, userId);

    if (!result.success) {
      throw new Error(`Failed to delete memory: ${result.error}`);
    }
  }

  async getMemoryHistory(userId: string = 'default'): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = await this.executePythonCommand('history', userId);

    if (!result.success) {
      throw new Error(`Failed to get memory history: ${result.error}`);
    }

    return result.history;
  }

  async getMemoryStats(userId?: string): Promise<MemoryStats> {
    const memories = userId ? await this.getAllMemories(userId) : await this.getAllMemories();
    
    const categoryCounts: Record<string, number> = {};
    const recentActivity: Array<any> = [];

    memories.forEach((memory) => {
      const category = memory.metadata?.category || 'general';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      if (memory.metadata?.timestamp) {
        recentActivity.push({
          timestamp: memory.metadata.timestamp,
          action: 'add',
          userId: memory.metadata.userId,
        });
      }
    });

    // Sort recent activity by timestamp
    recentActivity.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      totalMemories: memories.length,
      categoryCounts,
      recentActivity: recentActivity.slice(0, 10), // Last 10 activities
    };
  }

  // Utility methods for common use cases
  async addUserPreference(userId: string, preference: string, value: any): Promise<void> {
    await this.addMemory({
      content: `User preference: ${preference} = ${JSON.stringify(value)}`,
      metadata: {
        category: 'preference',
        tags: ['user-setting'],
        userId,
      },
    }, userId);
  }

  async addConversationContext(userId: string, context: string, sessionId?: string): Promise<void> {
    await this.addMemory({
      content: context,
      metadata: {
        category: 'conversation',
        tags: ['chat-context'],
        sessionId,
        userId,
      },
    }, userId);
  }

  async addProjectInfo(userId: string, projectInfo: string, projectId?: string): Promise<void> {
    await this.addMemory({
      content: projectInfo,
      metadata: {
        category: 'project',
        tags: ['project-info'],
        sessionId: projectId,
        userId,
      },
    }, userId);
  }

  async searchByCategory(category: string, userId: string = 'default'): Promise<MemoryEntry[]> {
    const allMemories = await this.getAllMemories(userId);
    return allMemories.filter(memory => memory.metadata?.category === category);
  }

  async searchByTags(tags: string[], userId: string = 'default'): Promise<MemoryEntry[]> {
    const allMemories = await this.getAllMemories(userId);
    return allMemories.filter(memory => 
      memory.metadata?.tags?.some(tag => tags.includes(tag))
    );
  }
}

// Export singleton instance
export const memoryManager = new Mem0Manager(); 