const admin = require("../config/admin");
const { authenticate } = require("../config/passport");
const statistics = require("../api/statistics");

module.exports = (app) => {
  app
    .route("/dashboard/statistics/count")
    .all(authenticate())
    .get(admin(statistics.dashboard));
};
