class AppError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = "AppError"
    this.statusCode = statusCode
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

class UnauthorizedError extends AppError {
  constructor(message: string = "Not authorized") {
    super(message, 401)
  }
}

class BadRequestError extends AppError {
  constructor(message: string = "Bad Request") {
    super(message, 400)
  }
}

export {
  AppError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  BadRequestError
}