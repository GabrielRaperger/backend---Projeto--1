const jwt = require("jwt-simple");

function generatePayload(user, days) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profile: user.profile,
    status_id: user.status_id,
    created_at: user.created_at,
    center_ids: user.center_ids,
    last_login: user.last_login,
    iat: now,
    exp: now + 60 * 60 * 24 * days,
  };
  return payload;
}

function generateToken(payload) {
  const token = jwt.encode(payload, process.env.AUTH_SECRET);
  return token;
}

module.exports = {
  generateToken,
  generatePayload,
};
