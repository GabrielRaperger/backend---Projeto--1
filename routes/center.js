const center = require("../api/center");
const account = require("../api/account");
const room = require("../api/room");
const admin = require("../config/admin");
const { authenticate } = require("../config/passport");

module.exports = (app) => {
  app
    .route("/center")
    .all(authenticate())
    .get(center.get)
    .post(admin(center.save));

  app
    .route("/center/:id/status")
    .all(authenticate())
    .put(admin(center.setStatus));

  app.route("/center/:id/rooms").all(authenticate()).get(room.getByCenter);

  app
    .route("/center/:id/accounts")
    .all(authenticate())
    .get(account.getByCenter);

  app
    .route("/center/:id")
    .all(authenticate())
    .get(center.getById)
    .put(admin(center.save))
    .delete(admin(center.remove));
};
