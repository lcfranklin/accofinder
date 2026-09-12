
/**
 * Middleware to validate a request part against a Joi schema
 *
 * @param {Object} schema - Joi validation schema
 * @param {string} [source='body'] - Which part of the request to validate:
 *                                   'body' (req.body) or 'query' (req.query)
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/', validateRequest(queryPropertySchema, 'query'), getAllProperties);
 *
 * @description
 * - Validates the chosen request part using the provided Joi schema
 * - Returns 400 with detailed error messages if validation fails
 * - Attaches validated data to `req.validatedData` if successful
 * - Uses `abortEarly: false` to collect all validation errors
 */

export const validateRequest = (schema, source = 'body') => {
return (req, res, next) => {
    const { error, value } = schema.validate(req[source] ?? {}, { abortEarly: false });

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