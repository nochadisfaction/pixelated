import type { APIRoute } from 'astro'
import { validationRunner } from '../../../../lib/ai/validation/ContinuousValidationRunner'
import { getLogger } from '../../../../lib/logging'
import {
  createAuditLog,
  AuditEventType,
  AuditEventStatus,
} from '../../../../lib/audit'

export const POST: APIRoute = async ({ request }) => {
  const logger = getLogger({ prefix: 'validation-webhook' })

  try {
    // Initialize the validation runner if needed
    await validationRunner.initialize()

    // Get webhook details from request
    const payload = await request.json()
    const event = request.headers.get('x-github-event') || 'unknown'
    const signature = request.headers.get('x-hub-signature-256') || ''

    // Validate the webhook and handle the event
    const result = await validationRunner.handleWebhook(
      payload,
      signature,
      event,
    )

    // Create audit log
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'validation-webhook',
      'system',
      'validation-api',
      {
        event,
        success: result.success,
        message: result.message,
      },
      result.success ? AuditEventStatus.SUCCESS : AuditEventStatus.FAILURE,
    )

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: result.message,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }
  } catch (error) {
    // Log the error
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Webhook processing error: ${errorMessage}`)

    // Create audit log
    await createAuditLog(
      AuditEventType.AI_OPERATION,
      'validation-webhook',
      'system',
      'validation-api',
      {
        error: errorMessage,
      },
      AuditEventStatus.FAILURE,
    )

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: `Failed to process webhook: ${errorMessage}`,
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
