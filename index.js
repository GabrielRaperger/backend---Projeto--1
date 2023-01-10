const app = require("express")();
const consign = require("consign");
require("dotenv").config();
require("./config/firestore-config");
const database = require("./config/database");

consign().then("./config/middlewares.js").then("./routes").into(app);

const port = process.env.PORT;

database
  .sync()
  .then(() =>
    app.listen(port, () => {
      console.log(`Backend start on port ${port}`);
    })
  )
  .catch((error) => {
    console.log("Server failed to start!");
    console.log(error);
  });
