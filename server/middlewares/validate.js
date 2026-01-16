export const requireJsonBody = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: 'Request body must be a JSON object' });
    return;
  }
  next();
};

