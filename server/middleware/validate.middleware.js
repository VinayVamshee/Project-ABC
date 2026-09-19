import { ZodError } from "zod";

export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorList = error.errors || error.issues || [];
        return res.status(400).json({
          success: false,
          message: "Input Validation Failed",
          errors: errorList.map(err => ({ field: err.path?.join('.') || 'unknown', message: err.message })),
        });
      }
      next(error);
    }
  };
};
