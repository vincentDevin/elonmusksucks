import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error('Pong Server Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Default error response
  let status = error.status || 500;
  let message = error.message || 'Internal server error';
  let code = error.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (error.message.includes('not found')) {
    status = 404;
    code = 'NOT_FOUND';
  } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
    status = 409;
    code = 'DUPLICATE_RESOURCE';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'Internal server error';
  }

  res.status(status).json({
    error: message,
    code,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
