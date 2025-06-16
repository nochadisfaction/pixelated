import type { APIRoute } from 'astro';
import { memoryManager } from '@/server/memory/mem0-manager';

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { memoryId, userId } = await request.json();

    if (!memoryId) {
      return new Response(
        JSON.stringify({ error: 'Memory ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    await memoryManager.deleteMemory(memoryId, userId);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error deleting memory:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete memory' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}; 