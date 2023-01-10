const bcrypt = require("bcrypt");
const jwt = require("jwt-simple");
const { Account } = require("../models/account");
const { getCurrentDateTime } = require("../config/moment");
const { sendEmail } = require("../config/nodemailer");
const { encryptPassword } = require("../utils/account");
const { generatePayload, generateToken } = require("../helper/auth-token");
const { isPasswordOrError, equalsOrError } = require("../helper/validator");
const {
  activationMail,
  resetPasswordMail,
  passwordChangedMail,
} = require("../helper/mail-templates");
const controller = {};

controller.signin = async (req, res) => {
  const profile = req.query.profile;
  if (!req.body.email || !req.body.password)
    return res.status(400).send("Requisição inválida");

  const account = await Account.findOne({
    where: { email: req.body.email },
  });
  if (!account) res.status(400).send("O e-mail ou password estão incorretos");

  const isMatch = bcrypt.compareSync(req.body.password, account.password);
  if (!isMatch)
    return res.status(400).send("O e-mail ou password estão incorretos");

  if (account.status_id !== 100) return res.status(401).send("Não autorizado");

  if (profile)
    if (account.profile !== profile)
      return res.status(401).send("Não autorizado");

  await Account.update(
    { last_login: getCurrentDateTime() },
    { where: { id: account.id }, individualHooks: true }
  );

  const payload = generatePayload(account, 3);
  const token = generateToken(payload);

  res.json({
    ...payload,
    token,
  });
};

controller.validateToken = async (req, res) => {
  const userData = req.body || null;
  try {
    if (userData) {
      const token = jwt.decode(userData.token, process.env.AUTH_SECRET);
      if (new Date(token.exp * 1000) > new Date()) {
        const user = await Account.findByPk(token.id);
        if (user && user.status_id === 100) {
          const payload = generatePayload(user, 3);
          const token = generateToken(payload);
          return res.json({ ...payload, token });
        }
      }
    }
  } catch (error) {}
  res.status(401).send(false);
};

controller.verifyAccount = async (req, res) => {
  const id = req.params.id;
  const tokenFromReq = req.params.token;
  try {
    if (id && tokenFromReq) {
      const token = jwt.decode(tokenFromReq, process.env.AUTH_SECRET);
      if (new Date(token.exp * 1000) > new Date()) {
        if (token.id == id) {
          Account.update(
            { status_id: 100 },
            {
              where: { id: id },
              individualHooks: true,
            }
          )
            .then((data) => {
              const user = { ...data[1][0].dataValues };
              const body = activationMail(user.name);
              sendEmail(user.email, "Ativação da Conta", body);
              res.status(204).send();
            })
            .catch((error) => {
              res.status(500).send(error);
            });
        } else throw "Link Inválido";
      } else throw "Link Inválido";
    } else throw "Link Inválido";
  } catch (error) {
    return res.status(400).send(error);
  }
};

controller.resetPasswordRequest = async (req, res) => {
  try {
    if (!req.body.email) return res.status(400).send("O e-mail é obrigatório");

    const account = await Account.findOne({ where: { email: req.body.email } });
    if (!account) return res.status(400).send("Conta não encontrada");
    if (account.status_id !== 100)
      return res.status(400).send("A conta está inativa");

    const payload = generatePayload(account, 1);
    const token = generateToken(payload);

    const link = `${account.id}/${token}`;
    const body = resetPasswordMail(account.name, link);
    sendEmail(account.email, "Repor Password", body);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).send(error);
  }
};

controller.resetPassword = async (req, res) => {
  const id = req.params.id;
  const tokenFromReq = req.params.token;

  try {
    if (!req.body.password || !req.body.confirm_password)
      return res.status(400).send("A nova password é obrigatória");

    equalsOrError(
      req.body.password,
      req.body.confirm_password,
      "As passwords não correspondem"
    );

    isPasswordOrError(
      req.body.password,
      "A password deve conter pelo menos oito caracteres, uma letra maiúscula, uma letra minúscula, um número e um caracter especial"
    );

    if (id && tokenFromReq) {
      const token = jwt.decode(tokenFromReq, process.env.AUTH_SECRET);
      if (new Date(token.exp * 1000) > new Date()) {
        if (token.id == id) {
          const newPassword = encryptPassword(req.body.password);
          Account.update(
            { password: newPassword },
            { where: { id: id }, individualHooks: true }
          )
            .then((data) => {
              if (data[0] > 0) {
                const user = { ...data[1][0].dataValues };
                const body = passwordChangedMail(user.name);
                sendEmail(user.email, "Password Alterada", body);
                return res.status(204).send();
              }
            })
            .catch((error) => res.status(500).send(error));
        } else throw "Link Inválido";
      } else throw "Link Inválido";
    } else throw "Link Inválido";
  } catch (error) {
    return res.status(400).send(error);
  }
};

module.exports = controller;
