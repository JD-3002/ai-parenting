export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (result.success) {
    req.validated = { ...(req.validated || {}), body: result.data };
    return next();
  }
  const errors = result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
  return res.status(400).json({ error: "Validation failed", details: errors });
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (result.success) {
    req.validated = { ...(req.validated || {}), query: result.data };
    return next();
  }
  const errors = result.error.issues.map((i) => `${i.path.join(".") || "query"}: ${i.message}`);
  return res.status(400).json({ error: "Validation failed", details: errors });
};
