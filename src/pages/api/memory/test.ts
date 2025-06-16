import type { APIRoute } from 'astro';
import { memoryManager } from '@/server/memory/mem0-manager';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const searchParams = new URLSearchParams(url.search);
    const action = searchParams.get('action') || 'list';
    const userId = searchParams.get('userId') || 'test_user';

    switch (action) {
      case 'list':
        const memories = await memoryManager.getAllMemories(userId);
        return new Response(JSON.stringify({
          success: true,
          data: memories,
          count: memories.length,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      case 'search':
        const query = searchParams.get('query');
        if (!query) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Query parameter is required for search',
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const searchResults = await memoryManager.searchMemories({
          query,
          userId,
          limit: parseInt(searchParams.get('limit') || '10'),
        });

        return new Response(JSON.stringify({
          success: true,
          data: searchResults,
          count: searchResults.length,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      case 'stats':
        const stats = await memoryManager.getMemoryStats(userId);
        return new Response(JSON.stringify({
          success: true,
          data: stats,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      case 'history':
        const history = await memoryManager.getMemoryHistory(userId);
        return new Response(JSON.stringify({
          success: true,
          data: history,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action. Supported actions: list, search, stats, history',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Memory API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { content, userId = 'test_user', metadata } = body;

    if (!content) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Content is required',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const memoryId = await memoryManager.addMemory({
      content,
      metadata: {
        timestamp: new Date().toISOString(),
        category: 'api-test',
        ...metadata,
      },
    }, userId);

    return new Response(JSON.stringify({
      success: true,
      data: { id: memoryId },
      message: 'Memory added successfully',
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Memory creation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create memory',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { memoryId, content, userId = 'test_user' } = body;

    if (!memoryId || !content) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Memory ID and content are required',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await memoryManager.updateMemory(memoryId, content, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Memory updated successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Memory update error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update memory',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { memoryId, userId = 'test_user' } = body;

    if (!memoryId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Memory ID is required',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await memoryManager.deleteMemory(memoryId, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Memory deleted successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Memory deletion error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete memory',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 