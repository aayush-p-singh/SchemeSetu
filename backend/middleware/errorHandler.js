const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError || (err && err.name === 'AppError')) {
    const body = { success: false, error: err.message };
    if (err.fields !== undefined) body.fields = err.fields;
    return res.status(err.statusCode || 500).json(body);
  }

  if (err instanceof ZodError || (err && err.name === 'ZodError')) {
    const fields = {};
    for (const issue of err.issues || []) {
      const key = issue.path.join('.') || '_root';
      if (!(key in fields)) fields[key] = issue.message;
    }
    return res.status(400).json({ success: false, error: 'Validation failed', fields });
  }

  if (err && err.name === 'ValidationError') {
    const fields = {};
    for (const e of Object.values(err.errors || {})) {
      fields[e.path] = e.message;
    }
    return res.status(400).json({ success: false, error: 'Validation failed', fields });
  }

  if (err && err.name === 'CastError') {
    return res.status(400).json({ success: false, error: `Invalid value for field: ${err.path}` });
  }

  if (err && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    return res.status(409).json({ success: false, error: `A record with this ${field} already exists` });
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Malformed JSON' });
  }

  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ success: false, error: 'Request body too large (max 15mb)' });
  }

  console.error('[error]', (err && err.stack) || err);
  return res.status(500).json({ success: false, error: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
