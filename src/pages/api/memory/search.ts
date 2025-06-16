import type { APIRoute } from 'astro';
import { memoryManager } from '@/server/memory/mem0-manager';

export const POST: APIRoute = async ({ request }) => {
  try {
    const options = await request.json();

    if (!options?.query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const memories = await memoryManager.searchMemories(options);

    return new Response(
      JSON.stringify({ success: true, memories }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error searching memories:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search memories' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}; 