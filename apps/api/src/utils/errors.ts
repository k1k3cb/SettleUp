/**
 * Todas las subclases deben llamar a fixErrorSubclassPrototype(this, X)
 * en su constructor para que `instanceof` funcione correctamente.
 *
 * Por qué: `super(message)` en el constructor de Error resetea
 * el [[Prototype]] a Error.prototype. AppError lo restaura a
 * AppError.prototype, pero las subclases de AppError (ValidationError,
 * etc.) necesitan restaurarlo a su propio prototype para que
 * `instanceof` las identifique correctamente.
 */
function fixErrorSubclassPrototype<T extends Error>(
  instance: T,
  ctor: new (...args: never[]) => T,
) {
  Object.setPrototypeOf(instance, ctor.prototype);
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    fixErrorSubclassPrototype(this, AppError);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    public details?: Record<string, string[]>,
  ) {
    super(message, 400);
    fixErrorSubclassPrototype(this, ValidationError);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    fixErrorSubclassPrototype(this, UnauthorizedError);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
    fixErrorSubclassPrototype(this, ForbiddenError);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
    fixErrorSubclassPrototype(this, NotFoundError);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    fixErrorSubclassPrototype(this, ConflictError);
  }
}
