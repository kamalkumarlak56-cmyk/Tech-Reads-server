const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
  }

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack
  });
};

module.exports = { notFound, errorHandler };
