function existsOrError(value, msg) {
  if (!value) throw msg;
  if (Array.isArray(value) && value.length === 0) throw msg;
  if (typeof value === "string" && !value.trim()) throw msg;
}

function notExistsOrError(value, msg) {
  try {
    existsOrError(value, msg);
  } catch (msg) {
    return;
  }
  throw msg;
}

function equalsOrError(valueA, valueB, msg) {
  if (valueA !== valueB) throw msg;
}

function isEmailOrError(value, msg) {
  if (!/[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/.test(value)) throw msg;
}

function isUrlOrError(value, msg) {
  if (
    !/(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_\+.~#?&\/\/=]*)/.test(
      value
    )
  )
    throw msg;
}

function isPasswordOrError(value, msg) {
  if (!/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$_%^&*-]).{8,}$/.test(value)) throw msg;
}

function isPhoneOrError(value, msg) {
  if (!/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}$/.test(value))
    throw msg;
}

module.exports = {
  existsOrError,
  notExistsOrError,
  equalsOrError,
  isEmailOrError,
  isUrlOrError,
  isPasswordOrError,
  isPhoneOrError,
};
