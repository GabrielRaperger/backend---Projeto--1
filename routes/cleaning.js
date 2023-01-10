const cleaning = require("../api/cleaning");
const { authenticate } = require("../config/passport");

module.exports = (app) => {
  app
    .route("/cleaning")
    .all(authenticate())
    .get(cleaning.get)
    .post(cleaning.save);

  app
    .route("/cleaning/statistics/count")
    .all(authenticate())
    .get(cleaning.count);

  app
    .route("/cleaning/statistics/average")
    .all(authenticate())
    .get(cleaning.duration);

  app
    .route("/cleaning/:id")
    .all(authenticate())
    .get(cleaning.getById)
    .delete(cleaning.remove);
};
