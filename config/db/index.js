const mongoose = require("mongoose");

async function connect() {
  try {
    await mongoose.connect(process.env.DB);
    console.log("success!");
  } catch (err) {
    console.log("fail!");
  }
}
module.exports = { connect };
