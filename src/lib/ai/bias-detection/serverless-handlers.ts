/**
 * Serverless Handler Utilities for Bias Detection Engine
 * Provides utilities for creating serverless-compatible API handlers
 */

export interface ServerlessRequest {
  method: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  path: string;
}

export interface ServerlessResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export type ServerlessHandler = (request: ServerlessRequest) => Promise<ServerlessResponse>;

/**
 * Creates a serverless-compatible handler wrapper
 */
export function createServerlessHandler(
  handler: (request: ServerlessRequest) => Promise<ServerlessResponse>
): ServerlessHandler {
  return async (request: ServerlessRequest): Promise<ServerlessResponse> => {
    try {
      // Add common headers to all responses
      const response = await handler(request);
      
      return {
        ...response,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          ...response.headers,
        },
      };
    } catch (error) {
      console.error('Serverless handler error:', error);
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
      };
    }
  };
}

/**
 * Utility to parse request body
 */
export function parseRequestBody(body: any): any {
  if (!body) {
    return null;
  }
  
  try {
    if (typeof body === 'string') {
      return JSON.parse(body);
    }
    return body;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Utility to validate required headers
 */
export function validateHeaders(
  headers: Record<string, string>,
  required: string[]
): void {
  for (const header of required) {
    if (!headers[header.toLowerCase()]) {
      throw new Error(`Missing required header: ${header}`);
    }
  }
}

/**
 * Utility to create error responses
 */
export function createErrorResponse(
  statusCode: number,
  message: string,
  details?: any
): ServerlessResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: message,
      details,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Utility to create success responses
 */
export function createSuccessResponse(
  data: any,
  statusCode: number = 200
): ServerlessResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
}

/**
 * Middleware for CORS handling
 */
export function withCORS(handler: ServerlessHandler): ServerlessHandler {
  return async (request: ServerlessRequest): Promise<ServerlessResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
        body: '',
      };
    }
    
    const response = await handler(request);
    
    return {
      ...response,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        ...response.headers,
      },
    };
  };
}

/**
 * Middleware for rate limiting
 */
export function withRateLimit(
  handler: ServerlessHandler,
  options: { limit: number; windowMs: number } = { limit: 100, windowMs: 60000 }
): ServerlessHandler {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return async (request: ServerlessRequest): Promise<ServerlessResponse> => {
    const clientId = request.headers['x-forwarded-for'] || 
                    request.headers['x-real-ip'] || 
                    'unknown';
    
    const now = Date.now();
    const clientData = requests.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requests.set(clientId, { count: 1, resetTime: now + options.windowMs });
    } else if (clientData.count >= options.limit) {
      return createErrorResponse(429, 'Too many requests');
    } else {
      clientData.count++;
    }
    
    return handler(request);
  };
}

/**
 * Middleware for authentication
 */
export function withAuth(handler: ServerlessHandler): ServerlessHandler {
  return async (request: ServerlessRequest): Promise<ServerlessResponse> => {
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse(401, 'Missing or invalid authorization header');
    }
    
    // Add user context to request for downstream handlers
    // In a real implementation, this would validate the JWT token
    (request as any).user = {
      id: 'user-123',
      email: 'user@example.com',
      role: 'analyst',
    };
    
    return handler(request);
  };
} 