const { Op } = require("sequelize");
const { Account } = require("../models/account");
const { Status } = require("../models/status");
const { Center } = require("../models/center");
const { sendEmail } = require("../config/nodemailer");
const { getCurrentDateTime } = require("../config/moment");
const { updateMail, verifyMail } = require("../helper/mail-templates");
const { generateToken, generatePayload } = require("../helper/auth-token");
const {
  isEmailOrError,
  isPhoneOrError,
  isPasswordOrError,
  existsOrError,
  notExistsOrError,
} = require("../helper/validator");
const {
  generatePassword,
  encryptPassword,
  validate,
  setAccountStatus,
  checkDependencies,
} = require("../utils/account");
const controller = {};

controller.save = async (req, res) => {
  const user = { ...req.body };
  const id = req.params.id;

  if (!user.status_id) user.status_id = 102;
  if (!user.profile) user.profile = "user";
  if (user.profile === "admin") user.center_ids = [];

  try {
    const { error } = validate(user);
    if (error) throw error.details[0].message;

    if (
      user.profile !== "user" &&
      user.profile !== "admin" &&
      user.profile !== "staff"
    )
      throw "O perfil da conta não é válido";

    if (user.profile !== "admin")
      if (user.center_ids.length === 0)
        throw "O utilizador deve estar associado a pelo menos um centro geográfico";

    isEmailOrError(user.email, "O e-mail não é válido");
    if (!user.password) user.password = generatePassword(12);
    else
      isPasswordOrError(
        user.password,
        "A password deve conter pelo menos oito caracteres, uma letra maiúscula, uma letra minúscula, um número e um caracter especial"
      );
    if (user.phone) isPhoneOrError(user.phone, "O telefone da conta não é válido");

    for (const centerId of user.center_ids) {
      const centerFromDb = await Center.findByPk(centerId);
      existsOrError(centerFromDb, `Centro geográfico não encontrado`);
    }

    if (!id) {
      const userFromDb = await Account.findOne({
        where: { email: user.email },
      });
      notExistsOrError(userFromDb, "Já existe uma conta com este e-mail");
    }
  } catch (error) {
    return res.status(400).send(error);
  }

  const password = user.password;
  user.password = encryptPassword(user.password);

  if (id) {
    Account.update(user, { where: { id: id }, individualHooks: true })
      .then(async (data) => {
        if (data[0] > 0) {
          const preValues = { ...data[1][0]._previousDataValues };
          const userInstance = await Account.findByPk(id);
          for (const centerId of preValues.center_ids) {
            const centerToDissociate = await Center.findByPk(centerId);
            userInstance.removeCenter(centerToDissociate, {
              through: "accounts_centers",
            });
          }
          for (const centerId of user.center_ids) {
            const centerToAssocite = await Center.findByPk(centerId);
            userInstance.addCenter(centerToAssocite, {
              through: "accounts_centers",
            });
          }
          const body = updateMail(user.name);
          sendEmail(user.email, "Conta Atualizada", body);
          res.status(204).send();
        } else res.status(400).send("Esta conta não existe");
      })
      .catch((error) => {
        res.status(500).send(error);
      });
  } else {
    user.created_at = getCurrentDateTime();
    Account.create(user)
      .then(async (data) => {
        for (const centerId of user.center_ids) {
          const centerToAssocite = await Center.findByPk(centerId);
          data.addCenter(centerToAssocite, { through: "accounts_centers" });
        }
        const payload = generatePayload(data, 7);
        const token = generateToken(payload);
        const body = verifyMail(data.name, `${data.id}/${token}`, password);
        sendEmail(user.email, "E-mail de Confirmação", body);
        res.status(201).send();
      })
      .catch((error) => res.status(500).send(error));
  }
};

controller.saveMany = async (req, res) => {
  var users = [...req.body];
  if (users.length > 20)
    return res
      .status(400)
      .send("Apenas é possivel criar 20 utilizadores de uma vez");

  try {
    var i = 2;
    for (const user of users) {
      user.status_id = 102;
      if (!user.profile) user.profile = "user";
      if (user.profile === "admin") user.center_ids = [];

      const { error } = validate(user);
      if (error) throw error.details[0].message;

      if (
        user.profile !== "user" &&
        user.profile !== "admin" &&
        user.profile !== "staff"
      )
        throw `Erro na linha ${i}: O perfil da conta não é válido`;

      if (user.profile !== "admin")
        if (user.center_ids.length === 0)
          throw `Erro na linha ${i}: O Utilizador deve estar associado a pelo menos um centro geográfico`;

      isEmailOrError(user.email, `Erro na linha ${i}: O e-mail não é válido`);
      user.password = generatePassword(12);
      if (user.phone) isPhoneOrError(user.phone, `Erro na linha ${i}: O telefone do utilizador não é válido`);

      for (const centerId of user.center_ids) {
        const centerFromDb = await Center.findByPk(centerId);
        existsOrError(centerFromDb, `Erro na linha ${i}: Centro geográfico não encontrado`);
      }

      const userFromDb = await Account.findOne({
        where: { email: user.email },
      });
      notExistsOrError(userFromDb, `Erro na linha ${i}: Já existe uma conta com este e-mail`);
      i += 1
    }
  } catch (error) {
    return res.status(400).send(error);
  }

  for (const user of users) {
    const password = user.password;
    user.password = encryptPassword(user.password);

    user.created_at = getCurrentDateTime();
    Account.create(user).then(async (data) => {
      for (const centerId of user.center_ids) {
        const centerToAssocite = await Center.findByPk(centerId);
        data.addCenter(centerToAssocite, { through: "accounts_centers" });
      }
      const payload = generatePayload(data, 7);
      const token = generateToken(payload);
      const body = verifyMail(data.name, `${data.id}/${token}`, password);
      sendEmail(user.email, "E-mail de Confirmação", body);
    });
  }

  res.status(201).send();
};

controller.get = async (req, res) => {
  Account.findAll({
    attributes: { exclude: ["password"] },
    include: [{ model: Status, as: "status" }],
  })
    .then((accounts) => res.json(accounts))
    .catch((error) => res.status(500).send(error));
};

controller.getById = (req, res) => {
  Account.findByPk(req.params.id, {
    attributes: { exclude: ["password"] },
    include: [
      { model: Status, as: "status" },
      { model: Center, as: "centers", attributes: ["name"] },
    ],
  })
    .then((account) => {
      if (!account) res.status(400).send("Conta não encontrada");
      else res.json(account);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

controller.getByCenter = (req, res) => {
  Account.findAll({
    attributes: { exclude: ["password"] },
    include: [{ model: Status, as: "status" }],
    where: { center_ids: { [Op.contains]: [req.params.id] } },
  })
    .then((accounts) => res.json(accounts))
    .catch((error) => res.status(500).send(error));
};

controller.remove = async (req, res) => {
  try {
    const id = req.params.id;
    checkDependencies(id)
      .then((msg) => {
        if (msg) return res.status(400).send(msg);
        else
          Account.destroy({
            where: { id: id },
            individualHooks: true,
          });
        return res.status(204).send();
      })
      .catch((error) => res.status(500).send(error));
  } catch (msg) {
    return res.status(400).send(msg);
  }
};

controller.setStatus = async (req, res) => {
  try {
    const id = req.params.id;
    if (!req.query.status) throw "Requisição inválida";

    const status = parseInt(req.query.status);
    if (status !== 100 && status !== 101) throw "Status inválido";

    setAccountStatus(id, status);

    return res.status(204).send();
  } catch (msg) {
    return res.status(400).send(msg);
  }
};

module.exports = controller;
