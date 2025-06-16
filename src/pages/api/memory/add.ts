import type { APIRoute } from 'astro';
import { memoryManager } from '@/server/memory/mem0-manager';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { entry, userId } = await request.json();

    if (!entry?.content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const id = await memoryManager.addMemory(entry, userId);

    return new Response(
      JSON.stringify({ success: true, id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error adding memory:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to add memory' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}; 