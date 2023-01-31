const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ntf = new Schema({
  type: String,
  userId: String,
  status: String,
  notify: Boolean,
  createdAt: String,
});
const account = new Schema({
  allowMessage: [{ userId: String, exp: Number }],
  notificationsCount: { notify: Number, message: Number },
  trustCode: [
    {
      code: String,
      exp: Number,
    },
  ],
  options: {
    info: Boolean,
    message: Boolean,
    search: Boolean,
    twoStep: Boolean,
  },
  userName: String,
  passWord: String,
  image: String,
  friends: [String],
  info: {
    name: String,
    phone: String,
    gender: String,
    birthday: String,
  },
  notify: [ntf],
  searchHistories: [
    {
      name: String,
      phone: String,
      gender: String,
      birthday: String,
      image: String,
      userName: String,
      userId: String,
    },
  ],
});
module.exports = mongoose.model("account", account);
