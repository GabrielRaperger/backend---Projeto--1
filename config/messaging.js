const { getMessaging } = require("firebase-admin/messaging");

function sendNotification(data, destination) {
  const message = {
    notification: { ...data },
    tokens: destination,
  };
  getMessaging()
    .sendMulticast(message)
    .then((response) => {
      console.log(response.successCount + " messages were sent successfully");
    })
    .catch((error) => console.log(error));
}

module.exports = {
  sendNotification,
};
