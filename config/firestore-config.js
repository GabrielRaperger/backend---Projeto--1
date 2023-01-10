const admin = require("firebase-admin");
//const serviceAccount = require("./firestore-sdk.json");
const serviceAccount = JSON.parse(process.env.FIRESTORE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
