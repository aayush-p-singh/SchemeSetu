class AppError extends Error {
  constructor(message, statusCode = 500, fields) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.fields = fields;
  }
}

module.exports = AppError;
