
/**
 * Middleware to validate request body against a Joi schema
 * 
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.post('/register', validateRequest(registerUserSchema), registerUser);
 * 
 * @description
 * - Validates `req.body` using the provided Joi schema
 * - Returns 400 with detailed error messages if validation fails
 * - Attaches validated data to `req.validatedData` if successful
 * - Uses `abortEarly: false` to collect all validation errors
 */

export const validateRequest = (schema) => {
return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        details: error.details.map(err => err.message)
      });
    }
    // Attach validated data to request object for use in controller
    req.validatedData = value;
    next();
  };
}