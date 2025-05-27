export class ContextManagerError extends Error {
  constructor(
    message: string = 'A generic error occurred in the ContextManager.',
  ) {
    super(message)
    this.name = 'ContextManagerError'
    Object.setPrototypeOf(this, ContextManagerError.prototype)
  }
}

export class FactorNotFoundError extends ContextManagerError {
  constructor(factorId: string) {
    super(`Context factor with ID '${factorId}' not found.`)
    this.name = 'FactorNotFoundError'
    Object.setPrototypeOf(this, FactorNotFoundError.prototype)
  }
}

export class InvalidFactorIdError extends ContextManagerError {
  constructor(
    factorId: string,
    message: string = `Invalid factor ID: '${factorId}'. ID must be a non-empty string.`,
  ) {
    super(message)
    this.name = 'InvalidFactorIdError'
    Object.setPrototypeOf(this, InvalidFactorIdError.prototype)
  }
}

export class InvalidFactorValueError extends ContextManagerError {
  constructor(
    factorId: string,
    value: any,
    message: string = `Invalid value for factor ID '${factorId}'. Value cannot be undefined.`,
  ) {
    super(message)
    this.name = 'InvalidFactorValueError'
    Object.setPrototypeOf(this, InvalidFactorValueError.prototype)
  }
}

export class InvalidSnapshotIdentifierError extends ContextManagerError {
  constructor(identifierName: 'sessionId' | 'userId', identifierValue: string) {
    super(
      `Invalid ${identifierName}: '${identifierValue}'. ${identifierName} must be a non-empty string.`,
    )
    this.name = 'InvalidSnapshotIdentifierError'
    Object.setPrototypeOf(this, InvalidSnapshotIdentifierError.prototype)
  }
}
