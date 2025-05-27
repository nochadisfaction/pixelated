/**
 * Custom error types for the MentalHealthTaskRouter.
 */

export class RoutingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoutingError'
    Object.setPrototypeOf(this, RoutingError.prototype)
  }
}

export class RouterInitializationError extends RoutingError {
  constructor(message: string) {
    super(message)
    this.name = 'RouterInitializationError'
    Object.setPrototypeOf(this, RouterInitializationError.prototype)
  }
}

export class LLMInvocationError extends RoutingError {
  public cause?: Error
  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'LLMInvocationError'
    this.cause = cause
    Object.setPrototypeOf(this, LLMInvocationError.prototype)
  }
}

export class ClassificationParseError extends RoutingError {
  public rawOutput?: string
  constructor(message: string, rawOutput?: string) {
    super(message)
    this.name = 'ClassificationParseError'
    this.rawOutput = rawOutput
    Object.setPrototypeOf(this, ClassificationParseError.prototype)
  }
}

export class RoutingDecisionError extends RoutingError {
  constructor(message: string) {
    super(message)
    this.name = 'RoutingDecisionError'
    Object.setPrototypeOf(this, RoutingDecisionError.prototype)
  }
}
