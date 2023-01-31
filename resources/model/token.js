const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const token = new Schema({
  userId: String,
  refeshToken: String,
  createdAt: Number,
  device: {},
});
module.exports = mongoose.model("token", token);
