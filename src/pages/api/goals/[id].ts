import type { TherapeuticGoal } from '@/lib/ai/types/TherapeuticGoals'
import type { APIRoute, APIContext } from 'astro'
import { goalSchema, goals } from './index' // Reuse schema if possible

export const GET: APIRoute = async ({ params }: APIContext) => {
  const { id } = params;
  const goal = goals.find((g: TherapeuticGoal) => g.id === id);
  if (!goal) {
    return new Response(JSON.stringify({ error: 'Goal not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify(goal), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const PUT: APIRoute = async ({ params, request }: APIContext) => {
  const { id } = params;

  if (typeof id !== 'string') {
    return new Response(JSON.stringify({ error: 'Invalid ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const idx = goals.findIndex((g: TherapeuticGoal) => g.id === id);
  if (idx === -1) {
    return new Response(JSON.stringify({ error: 'Goal not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    const data = await request.json()
    const parsed = goalSchema.safeParse(data)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: parsed.error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    const updatedGoal: TherapeuticGoal = {
      ...parsed.data,
      id,
      createdAt: goals[idx].createdAt,
      updatedAt: Date.now(),
    }
    goals[idx] = updatedGoal
    return new Response(JSON.stringify(updatedGoal), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Server error',
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

export const DELETE: APIRoute = async ({ params }: APIContext) => {
  const { id } = params;
  const idx = goals.findIndex((g: TherapeuticGoal) => g.id === id);
  if (idx === -1) {
    return new Response(JSON.stringify({ error: 'Goal not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  goals.splice(idx, 1)
  return new Response(null, { status: 204 })
}

export const prerender = false
