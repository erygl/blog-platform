class AppError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = "AppError"
    this.statusCode = statusCode
  }
}

class BadRequestError extends AppError {
  constructor(message: string = "Bad Request") {
    super(message, 400)
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string = "Not authorized") {
    super(message, 401)
  }
}

class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403)
  }
}

class NotFoundError extends AppError {
  constructor(message: string = "Not found") {
    super(message, 404)
  }
}

class ConflictError extends AppError {
  constructor(message: string = "Conflict") {
    super(message, 409)
  }
}


export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
}