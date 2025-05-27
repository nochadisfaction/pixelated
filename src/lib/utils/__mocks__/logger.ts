/**
 * Logger mock for testing
 */

export const logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  log: vi.fn(),
}

export const getLogger = vi.fn(() => logger)

export default {
  logger,
  getLogger,
}
