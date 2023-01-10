const reserve = require("../api/reserve");
const admin = require("../config/admin");
const { authenticate } = require("../config/passport");

module.exports = (app) => {
  app.route("/reserve").all(authenticate()).get(reserve.get).post(reserve.save);

  app
    .route("/reserve/statistics/count")
    .all(authenticate())
    .get(admin(reserve.count));

  app
    .route("/reserve/statistics/average")
    .all(authenticate())
    .get(admin(reserve.duration));

  app.route("/reserve/:id/status").all(authenticate()).put(reserve.setStatus);

  app
    .route("/reserve/:id")
    .all(authenticate())
    .get(reserve.getById)
    .put(reserve.save)
    .delete(reserve.remove);
};
