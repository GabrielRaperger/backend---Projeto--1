const account = require("../api/account");
const reserve = require("../api/reserve");
const admin = require("../config/admin");
const { authenticate } = require("../config/passport");

module.exports = (app) => {
  app
    .route("/account")
    .all(authenticate())
    .get(account.get)
    .post(admin(account.save))

  app.route("/account/many").all(authenticate()).post(admin(account.saveMany));

  app
    .route("/account/:id/status")
    .all(authenticate())
    .put(admin(account.setStatus));

  app
    .route("/account/:id")
    .all(authenticate())
    .get(account.getById)
    .put(account.save)
    .delete(admin(account.remove));
};
