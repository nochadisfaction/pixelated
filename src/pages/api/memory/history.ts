import type { APIRoute } from 'astro';
import { memoryManager } from '@/server/memory/mem0-manager';

export const GET: APIRoute = async ({ url }) => {
  try {
    const userId = url.searchParams.get('userId') || 'default';
    const history = await memoryManager.getMemoryHistory(userId);

    return new Response(
      JSON.stringify({ success: true, history }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting memory history:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get memory history' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}; 