const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const sendEmail = async (dest, subject, body) => {
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to: dest,
    subject: subject,
    html: body,
  });
};

module.exports = {
  sendEmail,
};
