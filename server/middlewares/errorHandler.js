export const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status =
    err && typeof err.status === 'number' && Number.isFinite(err.status)
      ? err.status
      : 500;
  const message =
    err && typeof err.message === 'string' && err.message
      ? err.message
      : 'Internal server error';
  res.status(status).json({ error: message });
};

