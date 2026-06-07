/** Base class for domain errors. Carries a stable `code`, no HTTP/transport knowledge. */
export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
    this.name = this.constructor.name;
  }
}

/** A referenced entity (room, participant, version) does not exist. */
export class NotFoundError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'NOT_FOUND', options);
  }
}

/** The action conflicts with current state (e.g. wrong phase, already closed). */
export class ConflictError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'CONFLICT', options);
  }
}

/** The caller's role is not permitted to perform the action. */
export class ForbiddenError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'FORBIDDEN', options);
  }
}

/** Input failed validation at a trust boundary. */
export class ValidationError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'VALIDATION', options);
  }
}
