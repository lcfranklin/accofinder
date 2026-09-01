export const socketMiddleware = (ioOrGetter) => {
  return (req, res, next) => {
    req.io = typeof ioOrGetter === 'function' ? ioOrGetter() : ioOrGetter;
    next();
  };
};
