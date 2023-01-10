const passport = require("passport");
const passportJwt = require("passport-jwt");
const { Strategy, ExtractJwt } = passportJwt;
const { Account } = require("../models/account");

const params = {
  secretOrKey: process.env.AUTH_SECRET,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const strategy = new Strategy(params, (payload, done) => {
  Account.findOne({ where: { id: payload.id } })
    .then((account) => {
      if (account)
        if (account.status_id === 100) return done(null, { ...payload });
      return done(null, false);
    })
    .catch((error) => done(error, false));
});

passport.use(strategy);

module.exports = {
  authenticate: () => passport.authenticate("jwt", { session: false }),
};
