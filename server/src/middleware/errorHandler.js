const { ApiError } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // SyntaxError from express.json() on malformed JSON body
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'Request body must be valid JSON.',
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `No route for ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
