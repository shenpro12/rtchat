const express = require("express");
const cors = require("cors");
const chatContent = require("./resources/model/chatContent");
const accounts = require("./resources/model/account");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const handlebars = require("express-handlebars");

const db = require("./config/db");
const route = require("./resources/route");

const app = express();
const port = 3001;

app.use(
  cors({
    credentials: true,
    origin: "https://rtchat-beta.vercel.app",
  })
);

app.use(express.json());

app.use(express.urlencoded());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "build")));

app.engine(
  "hbs",
  handlebars({
    extname: ".hbs",
  })
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "resources/views"));

db.connect();
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
route(app);

let userOnline = [];
const server = require("http").Server(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "https://rtchat-beta.vercel.app",
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  //user connect
  console.log("user connect:", socket.id);
  //save socketid when user connect
  socket.on("userLogin", async (token) => {
    const userData = await accounts.findOne({ _id: token.userId });
    // /console.log(userData);
    userOnline.push({
      socketId: socket.id,
      userName: token.userName,
      userId: token.userId,
      friends: [...userData.friends],
    });
    //console.log(userOnline);
    //send notification to friends
    userOnline.map((item) => {
      if (item.friends.includes(token.userId)) {
        io.to(item.socketId).emit("friendIsOnline", token.userName);
        io.to(item.socketId).emit("resCheckFriendOnline", {
          status: true,
          userName: token.userName,
        });
      }
    });
  });
  //
  socket.on("getOnlineFriends", (list) => {
    let temp = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < userOnline.length; j++) {
        if (list[i].userName == userOnline[j].userName) {
          temp.push({
            ...list[i],
            isOnline: true,
          });
          break;
        }
        if (j == userOnline.length - 1) {
          temp.push({
            ...list[i],
            isOnline: false,
          });
        }
      }
    }
    io.to(socket.id).emit("resOnlineFriends", temp);
  });
  //when user disconnect
  socket.on("disconnect", (reason) => {
    let user = userOnline.filter((item) => {
      if (item.socketId == socket.id) {
        return true;
      }
      return false;
    });
    //
    try {
      userOnline.map((item) => {
        if (item.friends.includes(user[0].userId)) {
          io.to(item.socketId).emit("friendsOff", user[0].userName);
          io.to(item.socketId).emit("resCheckFriendOnline", {
            status: false,
            userName: user[0].userName,
          });
          io.to(item.socketId).emit("friendIsStopTyping", user[0].userName); //close typing when user f5 or disconnect
        }
      });
    } catch {
      console.log("err");
    }
    //refesh online list
    userOnline = userOnline.filter((item) => {
      if (item.socketId == socket.id) {
        return false;
      }
      return true;
    });
  });
  //
  socket.on("checkFriendOnline", (userName, callback) => {
    userOnline.map((item) => {
      if (item.userName == userName) {
        callback(true);
        return;
      }
    });
    callback(false);
  });
  //when user typing and stop typing
  socket.on("usertyping", (req) => {
    userOnline.map((item) => {
      if (item.userName == req.contact) {
        io.to(item.socketId).emit("friendIsTyping", req.userName);
      }
    });
  });
  socket.on("userStopTyping", (req) => {
    userOnline.map((item) => {
      if (item.userName == req.contact) {
        io.to(item.socketId).emit("friendIsStopTyping", req.userName);
      }
    });
  });
  //
  socket.on("userSendMessage", async (message, contact, id) => {
    let bool = false;
    const user = await accounts.findOne({ _id: message[0].userId });
    const receiver = await accounts.findOne({ _id: contact });

    function check(item) {
      for (let i = 0; i < item.length; i++) {
        if (item[i].userId == message[0].userId && item[i].exp >= Date.now()) {
          return true;
        }
      }
      return false;
    }
    if (receiver.options.message) {
      bool = true;
      if (!user.friends.includes(contact)) {
        user.allowMessage = user.allowMessage.filter((item) => {
          if (item.userId == contact) {
            return false;
          }
          return true;
        });
        user.allowMessage = [
          ...user.allowMessage,
          { userId: contact, exp: Date.now() + 86400000 },
        ];
        await accounts.updateOne({ _id: user._id }, user);
      }
    } else {
      if (check(receiver.allowMessage)) {
        bool = true;
        if (!user.friends.includes(contact)) {
          user.allowMessage = user.allowMessage.filter((item) => {
            if (item.userId == contact) {
              return false;
            }
            return true;
          });
          user.allowMessage = [
            ...user.allowMessage,
            { userId: contact, exp: Date.now() + 86400000 },
          ];
          await accounts.updateOne({ _id: user._id }, user);
        }
      }
    }
    //
    let temp1 = receiver.allowMessage.filter((item) => {
      if (item.exp < Date.now()) {
        return false;
      }
      return true;
    });
    let temp2 = user.allowMessage.filter((item) => {
      if (item.exp < Date.now()) {
        return false;
      }
      return true;
    });
    receiver.allowMessage = temp1;
    user.allowMessage = temp2;
    await accounts.updateOne({ _id: receiver._id }, receiver);
    await accounts.updateOne({ _id: user._id }, user);
    //
    if (bool) {
      //console.log(id);
      let chat = await chatContent.findOne({
        userId: { $all: [contact, message[0].userId] },
      });
      //console.log(chat);
      //console.log(message);
      if (chat) {
        if (chat.contents[chat.contents.length - 1].delete.length == 0) {
          chat.contents[chat.contents.length - 1].mess.push(message[0]);
        } else {
          chat.contents.push({
            mess: [message[0]],
            delete: [],
          });
        }
        //
        chat.newMessage = {
          userId: message[0].userId,
          count: chat.newMessage.count + 1,
        };

        //
        await chatContent.updateOne(
          { userId: { $all: [contact, message[0].userId] } },
          chat
        );
      } else {
        const data = new chatContent({
          _id: id,
          userId: [contact, message[0].userId],
          contents: [
            {
              delete: [],
              mess: [message[0]],
            },
          ],
          newMessage: {
            userId: message[0].userId,
            count: 1,
          },
        });
        await data.save();
      }
      const userInfo = await accounts.findOne({ _id: contact });
      userInfo.notificationsCount = {
        message: userInfo.notificationsCount.message + 1,
        notify: userInfo.notificationsCount.notify,
      };
      await accounts.updateOne({ _id: userInfo._id }, userInfo);
      userOnline.map((item) => {
        if (item.userId == contact) {
          io.to([item.socketId, socket.id]).emit(
            "friendSendMessage",
            message[0],
            id
          );
          io.to([item.socketId]).emit("haveNewMessage");
        }
      });
      io.to([socket.id]).emit("friendSendMessage", message[0], id);
    } else {
      io.to(socket.id).emit("cantSendMessage");
    }
  });
  socket.on("userSeeMessage", async (id, userId) => {
    //console.log(id);
    //console.log(userId);
    let chat = await chatContent.findOne({
      _id: id,
    });
    //console.log(chat);

    if (chat && chat.newMessage && chat.newMessage.userId == userId) {
      chat.newMessage = { userId: "", count: 0 };
      //console.log(chat);
      await chatContent.updateOne({ _id: id }, chat, { timestamps: false });
    }

    io.to(socket.id).emit("seeDone");
  });
  socket.on("userCheckMessage", (userId, id) => {
    userOnline.map((item) => {
      if (item.userId == userId) {
        io.to(item.socketId).emit("friendSeeMessage", id);
      }
    });
  });
  //
  socket.on("userAddFriend", async (strangerId, myId) => {
    //console.log(myId);
    //console.log(strangerId);
    let bool = true;
    const userData = await accounts.findOne({ _id: myId });
    const strangerData = await accounts.findOne({ _id: strangerId });
    if (userData.notify.length) {
      userData.notify.map(async (item, index) => {
        if (
          item.userId == strangerId &&
          item.status == "waiting" &&
          item.type == "add"
        ) {
          bool = false;
          userData.friends.push(strangerId);
          strangerData.friends.push(myId);
          strangerData.notify.push({
            type: "request",
            userId: myId,
            status: "waiting",
            createdAt: Date.now(),
          });

          userData.notify[index].status = "processed";
          //console.log(userData);
          //console.log(strangerData);
          await accounts.updateOne({ _id: myId }, userData);
          await accounts.updateOne({ _id: strangerId }, strangerData);
          io.to(socket.id).emit("resAcceptAdd", strangerId);
          userOnline.map(async (item) => {
            if (item.userId == strangerId) {
              io.to([item.socketId]).emit("resAcceptAdd", myId);
              io.to([item.socketId]).emit("haveNewNotify", {
                type: "request",
                userName: userData.userName,
                image: userData.image,
                createdAt: Date.now(),
              });
            }
          });
          userOnline = userOnline.map((item) => {
            if (item.userId == strangerId) {
              return {
                ...item,
                friends: [...item.friends, myId],
              };
            }
            if (item.userId == myId) {
              return {
                ...item,
                friends: [...item.friends, strangerId],
              };
            }
            return item;
          });
        }
      });
    }
    if (bool) {
      strangerData.notify.push({
        type: "add",
        userId: myId,
        status: "waiting",
        createdAt: Date.now(),
      });
      await accounts.updateOne({ _id: strangerId }, strangerData);
      io.to(socket.id).emit("resAcceptAddWaiting", strangerId);
      userOnline.map(async (item) => {
        if (item.userId == strangerId) {
          io.to([item.socketId]).emit("resAcceptAdd");
          io.to([item.socketId]).emit("haveNewNotify", {
            type: "add",
            userName: userData.userName,
            image: userData.image,
            createdAt: Date.now(),
          });
        }
      });
    }
    const userInfo = await accounts.findOne({ _id: strangerId });
    userInfo.notificationsCount = {
      message: userInfo.notificationsCount.message,
      notify: userInfo.notificationsCount.notify + 1,
    };
    await accounts.updateOne({ _id: userInfo._id }, userInfo);
  });
  //
  socket.on("userCancelAddFriend", async (strangerId, myId) => {
    const strangerData = await accounts.findOne({ _id: strangerId });
    let notify = [...strangerData.notify];
    notify = notify.filter((item) => {
      if (item.userId == myId && item.status == "waiting") {
        return false;
      }
      return true;
    });
    strangerData.notify = [...notify];
    await accounts.updateOne({ _id: strangerId }, strangerData);
    io.to(socket.id).emit("cancelAdd", strangerId);
    userOnline.map((item) => {
      if (item.userId == strangerId) {
        io.to([item.socketId]).emit("strangerCancelAdd");
      }
    });
  });
  //
  socket.on("userDeleteFriend", async (friendId, myId) => {
    const userData = await accounts.findOne({ _id: myId });
    const friendData = await accounts.findOne({ _id: friendId });
    userData.friends = userData.friends.filter((i) => {
      if (i == friendId) {
        return false;
      }
      return true;
    });
    userData.notify = userData.notify.filter((i) => {
      if (i.userId == friendId) {
        return false;
      }
      return true;
    });
    friendData.friends = friendData.friends.filter((i) => {
      if (i == myId) {
        return false;
      }
      return true;
    });
    friendData.notify = friendData.notify.filter((i) => {
      if (i.userId == myId) {
        return false;
      }
      return true;
    });
    await accounts.updateOne({ _id: myId }, userData);
    await accounts.updateOne({ _id: friendId }, friendData);
  });
  //
  socket.on("userCheckNotify", async (notifyId, myId) => {
    const userData = await accounts.findOne({ _id: myId });
    userData.notify = userData.notify.map((item) => {
      if (item._id == notifyId) {
        item.status = "processed";
        return item;
      }
      return item;
    });
    await accounts.updateOne({ _id: myId }, userData);
    io.to(socket.id).emit("resCheckNotify", notifyId);
  });
});
server.listen(port);
