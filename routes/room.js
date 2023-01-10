const room = require("../api/room");
const cleaning = require("../api/cleaning");
const admin = require("../config/admin");
const reserve = require("../api/reserve");
const { authenticate } = require("../config/passport");

module.exports = (app) => {
  app.route("/room").all(authenticate()).get(room.get).post(admin(room.save));

  app
    .route("/room/statistics/mostUsed")
    .all(authenticate())
    .get(admin(room.mostUsed));

  app
    .route("/room/statistics/ocupation")
    .all(authenticate())
    .get(admin(reserve.ocupation));

  app.route("/room/:id/status").all(authenticate()).put(admin(room.setStatus));

  app
    .route("/room/:id/cleanings")
    .all(authenticate())
    .get(admin(cleaning.getByRoom));

  app
    .route("/room/:id")
    .all(authenticate())
    .get(room.getById)
    .put(admin(room.save))
    .delete(admin(room.remove));
};
