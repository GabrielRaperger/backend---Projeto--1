const messaging = require("../api/messaging");
const { authenticate } = require("../config/passport");

module.exports = (app) => {
  app
    .route("/messaging")
    .all(authenticate())
    .get(messaging.get)
    .post(messaging.save);

  app
    .route("/messaging/:id")
    .all(authenticate())
    .get(messaging.getById)
    .delete(messaging.remove);
};
