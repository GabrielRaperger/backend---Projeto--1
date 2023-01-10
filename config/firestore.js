const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

const collections = {
  centers: db.collection("centers"),
  rooms: db.collection("rooms"),
  accounts: db.collection("accounts"),
  reserves: db.collection("reserves"),
  cleanings: db.collection("cleanings"),
  messaging: db.collection("messaging")
};

module.exports = collections;
