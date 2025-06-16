import type { APIRoute } from 'astro';
import { memoryManager } from '@/server/memory/mem0-manager';

export const GET: APIRoute = async ({ url }) => {
  try {
    const userId = url.searchParams.get('userId') || undefined;
    const stats = await memoryManager.getMemoryStats(userId);

    return new Response(
      JSON.stringify({ success: true, stats }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting memory stats:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get memory stats' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}; 