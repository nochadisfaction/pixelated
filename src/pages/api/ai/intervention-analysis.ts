import type { APIRoute } from 'astro'
import type { AIMessage } from '../../../lib/ai/models/ai-types.js'
// Import the type expected by InterventionAnalysisService
import type { AIService } from '../../../lib/ai/models/types.js'
import { InterventionAnalysisService } from '../../../lib/ai/services/intervention-analysis.js'
import { createTogetherAIService } from '../../../lib/ai/services/together.js'
import { createAuditLog } from '../../../lib/audit'
import { getSession } from '../../../lib/auth/session.js'
import { aiRepository } from '../../../lib/db/ai/index.js'

/**
 * API route for intervention effectiveness analysis
 */
export const POST: APIRoute = async ({ request }) => {
  let session

  try {
    // Verify session
    session = await getSession(request)
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const body = await request.json()
    const { conversation, interventionMessage, userResponse, batch, model } =
      body

    // Validate required fields
    if (!(conversation && interventionMessage && userResponse) && !batch) {
      return new Response(
        JSON.stringify({
          error:
            'Either conversation, interventionMessage, and userResponse or batch is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Create AI service
    const aiService = createTogetherAIService({
      togetherApiKey: import.meta.env.TOGETHER_API_KEY,
      togetherBaseUrl: import.meta.env.TOGETHER_BASE_URL,
      apiKey: '',
    })

    // Use the model from the request or the default model
    const modelId = model || 'mistralai/Mixtral-8x7B-Instruct-v0.2'

    // Create intervention analysis service
    const interventionService = new InterventionAnalysisService({
      aiService: aiService as unknown as AIService, // Force the type to match what InterventionAnalysisService expects
      model: modelId,
    })

    // Log the request
    await createAuditLog({
      id: crypto.randomUUID(),
      userId: session?.user?.id || 'anonymous',
      action: 'ai.intervention.request',
      resource: {
        id: 'intervention-analysis',
        type: 'ai',
      },
      timestamp: new Date(),
      metadata: {
        model: modelId,
        batchSize: batch ? batch.length : 0,
      },
    })

    // Start timer for latency measuremen
    const startTime = Date.now()

    // Process the request
    let result
    if (batch) {
      result = await interventionService.analyzeBatch(batch)

      // Store each result in the database
      for (let i = 0; i < result?.length; i += 1) {
        const analysis = result[i]
        const latencyMs = Date.now() - startTime
        const batchItem = batch[i]

        await aiRepository.storeInterventionAnalysis({
          userId: session?.user?.id,
          modelId,
          modelProvider: 'together',
          requestTokens: 0, // No usage information available
          responseTokens: 0, // No usage information available
          totalTokens: 0, // No usage information available
          latencyMs,
          success: true,
          error: null,
          conversation: JSON.stringify(batchItem.conversation),
          intervention: batchItem.interventionMessage,
          userResponse: batchItem.userResponse,
          effectiveness: analysis.score,
          insights: JSON.stringify({
            areas: analysis.areas || [],
            confidence: analysis.confidence,
          }),
          recommendedFollowUp: analysis.recommendations
            ? analysis.recommendations.join('\n')
            : '',
          metadata: {
            batchIndex: i,
            batchSize: batch.length,
          },
        })
      }
    } else {
      // Convert conversation to AIMessage[] if it's not already
      const conversationMessages = Array.isArray(conversation)
        ? conversation
        : ([{ role: 'user', content: conversation, name: '' }] as AIMessage[])

      result = await interventionService.analyzeIntervention(
        conversationMessages,
        interventionMessage,
        userResponse,
      )

      const latencyMs = Date.now() - startTime

      // Store the result in the database
      await aiRepository.storeInterventionAnalysis({
        userId: session?.user?.id || 'anonymous',
        modelId,
        modelProvider: 'together',
        requestTokens: 0, // No usage information available
        responseTokens: 0, // No usage information available
        totalTokens: 0, // No usage information available
        latencyMs,
        success: true,
        error: null,
        conversation: JSON.stringify(conversationMessages),
        intervention: interventionMessage,
        userResponse,
        effectiveness: result.score,
        insights: JSON.stringify({
          areas: result.areas || [],
          confidence: result.confidence,
        }),
        recommendedFollowUp: result.recommendations
          ? result.recommendations.join('\n')
          : '',
        metadata: {},
      })
    }

    // Log the response
    await createAuditLog({
      id: crypto.randomUUID(),
      userId: session?.user?.id || 'anonymous',
      action: 'ai.intervention.response',
      resource: {
        id: 'intervention-analysis',
        type: 'ai',
      },
      timestamp: new Date(),
      metadata: {
        model: modelId,
        resultCount: Array.isArray(result) ? result.length : 1,
        latencyMs: Date.now() - startTime,
      },
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Error in intervention analysis API:', error)

    // Create audit log for the error
    await createAuditLog({
      id: crypto.randomUUID(),
      userId: session?.user?.id || 'anonymous',
      action: 'ai.intervention.error',
      resource: {
        id: 'intervention-analysis',
        type: 'ai',
      },
      timestamp: new Date(),
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        status: 'error',
      },
    })

    return new Response(
      JSON.stringify({
        error: 'An error occurred during intervention analysis',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
