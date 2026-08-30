export const errorHandler = (err, req, res, next) => {
  console.error("🔥 Global Error Handler Caught:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(err.errors).map((val) => val.message),
    });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate field value entered",
    });
  }

  // Zod Validation Error
  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Input Validation Failed",
      errors: err.errors,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
