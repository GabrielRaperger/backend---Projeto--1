const auth = require("../api/auth");

module.exports = (app) => {
  app.post("/signin", auth.signin);
  app.post("/validateToken", auth.validateToken);
  app.post("/verify/:id/:token", auth.verifyAccount);
  app.post("/resetPassword/:id/:token", auth.resetPassword);
  app.post("/resetPassword", auth.resetPasswordRequest);
};
