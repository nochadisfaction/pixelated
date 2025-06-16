import type { APIRoute } from 'astro';
import { memoryManager } from '@/server/memory/mem0-manager';

export const GET: APIRoute = async ({ url }) => {
  try {
    const userId = url.searchParams.get('userId') || 'default';
    const memories = await memoryManager.getAllMemories(userId);

    return new Response(
      JSON.stringify({ success: true, memories }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting all memories:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get memories' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}; 