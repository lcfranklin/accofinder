export const socketMiddleware = (ioOrGetter) => {
  return (req, res, next) => {
    try {
      req.io = typeof ioOrGetter === 'function' ? ioOrGetter() : ioOrGetter;
    } catch {
      req.io = null;
    }
    next();
  };
};
