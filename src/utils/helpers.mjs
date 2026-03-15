/**
 * Wrapper for async route handlers to automatically catch and forward errors to the error middleware
 * @param {Function} fn - The asynchronous route handler
 * @returns {Function} wrapped handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Standardized API Response formatter
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {boolean} success - Operation success flag
 * @param {string} message - User-friendly message
 * @param {any} data - Response payload
 */
export const sendResponse = (res, status, success, message, data = null) => {
  res.status(status).json({
    success,
    message,
    data,
  });
};

/**
 * Formats mongoose validation errors into a clean key-value object
 * @param {Object} err - Mongoose error object
 * @returns {Object} formated errors
 */
export const formatMongooseValidationErrors = (err) => {
  const formattedErrors = {};
  if (err.name === 'ValidationError') {
    for (const field in err.errors) {
      formattedErrors[field] = err.errors[field].message;
    }
  }
  return formattedErrors;
};
