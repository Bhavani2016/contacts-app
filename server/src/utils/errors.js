class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function badRequest(message, details) {
  return new ApiError(400, 'BAD_REQUEST', message, details);
}

function validationError(details) {
  return new ApiError(422, 'VALIDATION_ERROR', 'One or more fields are invalid.', details);
}

function notFound(message = 'Resource not found.') {
  return new ApiError(404, 'NOT_FOUND', message);
}

function conflict(message, details) {
  return new ApiError(409, 'CONFLICT', message, details);
}

module.exports = { ApiError, badRequest, validationError, notFound, conflict };
