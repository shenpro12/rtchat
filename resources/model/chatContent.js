const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatBlock = new Schema({
  delete: [String],
  mess: [
    {
      _id: String,
      delete: [String],
      userId: String,
      content: String,
      createdAt: Number,
    },
  ],
});
const chatContent = new Schema(
  {
    userId: [String],
    contents: [chatBlock],
    newMessage: {
      userId: String,
      count: Number,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("chatcontent", chatContent);
