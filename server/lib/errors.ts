/**
 * Error model shared by every function.
 *
 * The codes are the Firebase Functions / Google Cloud convention (`not-found`,
 * `permission-denied`, …) rather than generic HTTP names, because the handlers
 * are written to run unchanged behind the Functions Framework and API Gateway.
 * The HTTP adapter is the only place that maps a code to a status.
 */

export type ApiErrorCode =
  | 'invalid-argument'
  | 'unauthenticated'
  | 'permission-denied'
  | 'not-found'
  | 'already-exists'
  | 'failed-precondition'
  | 'unavailable'
  | 'internal';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  'invalid-argument': 400,
  unauthenticated: 401,
  'permission-denied': 403,
  'not-found': 404,
  'already-exists': 409,
  'failed-precondition': 412,
  unavailable: 503,
  internal: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static invalid(message: string, details?: unknown): ApiError {
    return new ApiError('invalid-argument', message, details);
  }

  static unauthenticated(message = 'Sign in required'): ApiError {
    return new ApiError('unauthenticated', message);
  }

  static forbidden(message = 'Not allowed'): ApiError {
    return new ApiError('permission-denied', message);
  }

  static notFound(message: string): ApiError {
    return new ApiError('not-found', message);
  }

  static conflict(message: string): ApiError {
    return new ApiError('already-exists', message);
  }

  static precondition(message: string): ApiError {
    return new ApiError('failed-precondition', message);
  }
}

export type ErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export function toErrorBody(error: ApiError): ErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
}
