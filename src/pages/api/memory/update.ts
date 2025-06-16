import type { APIRoute } from 'astro';
import { memoryManager } from '@/server/memory/mem0-manager';

export const PUT: APIRoute = async ({ request }) => {
  try {
    const { memoryId, content, userId } = await request.json();

    if (!memoryId || !content) {
      return new Response(
        JSON.stringify({ error: 'Memory ID and content are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    await memoryManager.updateMemory(memoryId, content, userId);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating memory:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update memory' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}; 