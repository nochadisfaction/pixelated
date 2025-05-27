import type { APIRoute } from 'astro'

// Basic email validation regex
const EMAIL_REGEX = /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/

export const POST: APIRoute = async ({ request }) => {
  try {
    let data: any
    try {
      data = await request.json()
    } catch (_e) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid JSON payload.',
        }),
        { status: 400 },
      )
    }

    // Validate required fields and their types/formats
    const fieldsToValidate = [
      {
        name: 'name',
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 100,
      },
      {
        name: 'email',
        required: true,
        type: 'string',
        regex: EMAIL_REGEX,
        maxLength: 100,
      },
      {
        name: 'subject',
        required: true,
        type: 'string',
        minLength: 5,
        maxLength: 150,
      },
      {
        name: 'message',
        required: true,
        type: 'string',
        minLength: 10,
        maxLength: 5000,
      },
    ]

    for (const field of fieldsToValidate) {
      const value = data[field.name]

      if (
        field.required &&
        (value === undefined || value === null || String(value).trim() === '')
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Missing required field: ${field.name}.`,
          }),
          { status: 400 },
        )
      }

      // Skip further validation if field is not present and not required
      if (
        !field.required &&
        (value === undefined || value === null || String(value).trim() === '')
      ) {
        continue
      }

      if (
        value !== undefined &&
        value !== null &&
        typeof value !== field.type
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Field '${field.name}' must be a ${field.type}. Received: ${typeof value}`,
          }),
          { status: 400 },
        )
      }

      if (field.minLength && String(value).length < field.minLength) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Field '${field.name}' must be at least ${field.minLength} characters long.`,
          }),
          { status: 400 },
        )
      }

      if (field.maxLength && String(value).length > field.maxLength) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Field '${field.name}' must not exceed ${field.maxLength} characters.`,
          }),
          { status: 400 },
        )
      }

      if (field.regex && !field.regex.test(String(value))) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Invalid format for field: ${field.name}.`,
          }),
          { status: 400 },
        )
      }
    }

    // Fields are validated. Proceed with application logic.
    // E.g., check for spam, store the message, send notifications etc.
    // For now, we'll just log it as before.
    // It's important that any data used in dynamic HTML rendering later is properly escaped/sanitized
    // at the point of rendering to prevent XSS, even with input validation.

    console.log('Contact form submission (validated):', data)

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    return new Response(
      JSON.stringify({
        success: true,
        message:
          'Your message has been received. We will get back to you soon!',
      }),
      { status: 200 },
    )
  } catch (error) {
    console.error('Error processing contact form:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to process form submission, please try again later',
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
