function updateMail(name) {
  return `<h1>Olá ${name}!</h1>
    <h2>A tua conta foi atualizada com sucesso!</h2>
    <br>
    <h4>Obrigado</h4>
    <h3>Meeting Manager</h3>`;
}

function verifyMail(name, link, password) {
  return `<h1>Bem vindo, ${name}!</h1>
    <h2>Obrigado por aderires ao Meeting Manager!</h2>
    <br>
    <p>Esta é a tua password: <b>${password}</b></p>
    <h4>Por favor, confirma o teu e-mail clicando no seguinte link:</h4>
    <a href=${process.env.FRONTED_URL}/auth/verify/${link}>Confirmar</a>`;
}

function activationMail(name) {
  return `<h1>Olá ${name}!</h1>
    <h2>A tua conta está agora ativa!</h2>
    <br>
    <h4>Podes fazer login na nossa aplicação para alterares a tua password</h4>
    <h3>Meeting Manager</h3>`;
}

function resetPasswordMail(name, link) {
  return `<h1>Olá ${name}!<h1>
    <h2>Clica no seguinte link para alterares a tua password:</h2>
    <a href=${process.env.FRONTED_URL}/auth/reset-password/${link}>Alterar</a>
    <br>
    <h4>Se não pediste para alterar a password, podes ignorar este e-mail e a tua password permanecerá igual.</h4>
    <h3>Meeting Manager</h3>`;
}

function passwordChangedMail(name) {
  return `<h1>Olá ${name}!</h1>
    <h2>A tua password foi alterada com sucesso! Podes agora fazer login com a tua nova password.</h2>
    <br>
    <h4>Obrigado</h4>
    <h3>Meeting Manager</h3>`;
}

module.exports = {
  updateMail,
  verifyMail,
  activationMail,
  resetPasswordMail,
  passwordChangedMail
};
