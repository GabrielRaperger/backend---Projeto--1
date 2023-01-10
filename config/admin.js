module.exports = (middleware) => {
  return (req, res, next) => {
    if (req.user.profile === "admin") middleware(req, res, next);
    else res.status(403).send("Unauthorized");
  };
};
