const accounts = require("../model/account");
const tokens = require("../model/token");
const jwtHelper = require("../helpers/jwt.helper");
const chatContent = require("../model/chatContent");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
  secure: true,
});

class userControllers {
  //POST user/friends
  async friends(req, res) {
    //console.log(req.cookies._token);
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    const userInfo = await accounts.findOne({ _id: userData.data._id });
    const userFriends = userInfo.friends;
    const response = Promise.all(
      userFriends.map(async (item) => {
        const friendsInfo = await accounts.findOne({ _id: item });
        return {
          name: friendsInfo.info.name ? friendsInfo.info.name : "",
          userName: friendsInfo.userName,
          image: friendsInfo.image,
          _id: friendsInfo._id,
        };
      })
    );
    //res.clearCookie("_token");
    res.json({ friends: await response });
  }
  //POST user/message
  async message(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    //
    const chat = await chatContent.find({ userId: userData.data._id });
    //console.log(chat);
    const respone = Promise.all(
      chat.map(async (item) => {
        let contact = [];
        const contents = [];
        //get info of contact
        item.userId.map((item) => {
          if (item != userData.data._id) {
            contact.push(item);
          }
        });
        contact = Promise.all(
          contact.map(async (item) => {
            const c = await accounts.findOne({ _id: item });
            return {
              userName: c.userName,
              _id: item,
              image: c.image,
              name: c.info.name ? c.info.name : "",
            };
          })
        );
        //get message contents
        const c = item.contents.filter((item) => {
          if (item.delete.includes(userData.data._id)) {
            return false;
          }
          return true;
        });
        //console.log(c);
        c.map((item) => {
          item.mess.map((item) => {
            if (!item.delete.includes(userData.data._id)) {
              contents.push(item);
            }
          });
        });
        //console.log(contents);
        return {
          _id: item._id,
          contact: await contact,
          contents: contents,
          newMessage: item.newMessage,
          updatedAt: item.updatedAt,
        };
      })
    );
    //res.cookie("levandat", "abc", { expires: new Date(Date.now() + 900000) });
    res.json({
      respone: (await respone).sort(function (a, b) {
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }),
    });
  }
  //POST user/objId
  objId(req, res) {
    let _id = new mongoose.Types.ObjectId();
    res.json({ _id });
  }
  //POST user/profile
  async profile(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    const userInfo = await accounts.findOne({ _id: userData.data._id });
    //console.log(userInfo);
    res.json({
      profile: {
        ...userInfo.info,
        userName: userInfo.userName,
        image: userInfo.image,
      },
    });
  }
  //POST user/profile/update
  async update(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });

    userInfo.info = req.body.data.userData;
    if (req.body.data.imageUrl) {
      if (userInfo.image) {
        cloudinary.uploader.destroy(
          userInfo.image.slice(61, 81),
          function (error, result) {
            console.log(result, error);
          }
        );
      }
      userInfo.image = req.body.data.imageUrl;
    }
    await accounts.updateOne({ _id: userData.data._id }, userInfo);
    res.json({ status: true });
  }
  //POST user/profile/friend
  async friend(req, res) {
    let info = {};
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    if (userInfo.friends.includes(req.body.data._id)) {
      try {
        let friendInfo = await accounts.findOne({ _id: req.body.data._id });
        if (friendInfo.options.info) {
          info = {
            ...friendInfo.info,
            userName: friendInfo.userName,
            image: friendInfo.image,
          };
        } else {
          info = {
            name: "",
            phone: "",
            gender: "",
            birthday: "",
            userName: friendInfo.userName,
            image: friendInfo.image,
          };
        }
      } catch {
        console.log("_id is not accept");
      }
    }

    res.json({ info });
  }
  //POST user/profile/search
  async search(req, res) {
    let info = [];
    let token = req.cookies._token.refeshToken;

    const userToken = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userData = await accounts.findOne({
      _id: userToken.data._id,
    });
    let userInfo = await accounts.find({
      $or: [
        { userName: { $regex: req.body.data.userName, $options: "i" } },
        { "info.name": { $regex: req.body.data.userName, $options: "i" } },
      ],
    });

    if (userInfo) {
      info = userInfo
        .map((item) => {
          let notify = false;
          if (item.notify) {
            item.notify.map((i) => {
              if (
                i.userId == userData._id &&
                i.status == "waiting" &&
                i.type == "add"
              ) {
                notify = true;
              }
            });
          }
          let search = false;
          if (
            item.friends.includes(userData._id) ||
            item.options.search == true
          ) {
            search = true;
          }
          return {
            name: item.info.name,
            phone: item.options.info ? item.info.phone : "",
            gender: item.options.info ? item.info.gender : "",
            birthday: item.options.info ? item.info.birthday : "",
            userName: item.userName,
            image: item.image,
            _id: item._id,
            friend: userData.friends.includes(item._id) ? true : false,
            notify,
            search,
          };
        })
        .filter((item) => {
          if (
            item.userName == userToken.data.userName ||
            item.search == false
          ) {
            return false;
          }
          return true;
        });
    }
    //console.log(info);
    res.json({ info, status: info.length ? true : false });
  }
  //POST user/notifications
  async notifications(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    let respone = [];
    if (userInfo.notify) {
      respone = Promise.all(
        userInfo.notify.map(async (item) => {
          let i = await accounts.findOne({ _id: item.userId });
          if (i.options.info) {
            return {
              ...item._doc,
              name: i.info.name,
              userName: i.userName,
              phone: i.info.phone,
              birthday: i.info.birthday,
              gender: i.info.gender,
              image: i.image,
            };
          } else {
            return {
              ...item._doc,
              name: i.info.name,
              userName: i.userName,
              phone: "",
              birthday: "",
              gender: "",
              image: i.image,
            };
          }
        })
      );
    }
    //console.log(await respone);
    res.json({ notify: (await respone).reverse() });
  }
  //POST user/message/delete
  async message_delete(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    const chat = await chatContent.findOne({ _id: req.body.data._id });
    //console.log(chat);
    let temp = [...chat.contents];
    temp = temp.map((item) => {
      if (!item.delete.includes(userData.data._id)) {
        item.delete = [...item.delete, userData.data._id];
      }
      return item;
    });

    chat.contents = temp;
    if (chat.newMessage.userId != userData.data._id) {
      chat.newMessage = { userId: "", count: 0 };
    }
    await chatContent.updateOne({ _id: req.body.data._id }, chat, {
      timestamps: false,
    });
    res.json({ status: true });
  }
  //POST user/notifications/delete
  async notifications_delete(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    let temp = userInfo.notify.filter((item) => {
      if (item._id == req.body.data.id) {
        return false;
      }
      return true;
    });
    userInfo.notify = temp;
    await accounts.updateOne({ _id: userData.data._id }, userInfo);
    res.json({ status: true });
  }
  //POST user/searchhistories
  async searchhistories(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    let data = Promise.all(
      userInfo.searchHistories.map(async (item) => {
        const user = await accounts.findOne({ _id: item.userId });
        if (user.options.info) {
          return {
            name: user.info.name,
            phone: user.info.phone,
            gender: user.info.gender,
            birthday: user.info.birthday,
            image: user.image,
            userName: user.userName,
            userId: user._id,
          };
        } else {
          return {
            name: user.info.name,
            phone: "",
            gender: "",
            birthday: "",
            image: user.image,
            userName: user.userName,
            userId: user._id,
          };
        }
      })
    );
    console.log(await data);
    res.json({ data: await data });
  }
  //POST user/searchhistories/delete
  async searchhistories_delete(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    let temp = [...userInfo.searchHistories];
    temp = temp.filter((item) => {
      if (item.userName == req.body.data.userName) {
        return false;
      }
      return true;
    });
    userInfo.searchHistories = temp;
    await accounts.updateOne({ _id: userData.data._id }, userInfo);
    res.json({ status: true });
  }
  //POST user/searchhistories/add
  async searchhistories_add(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    let check = true;
    userInfo.searchHistories.map((item) => {
      if (item.userId == req.body.data.historyData.userId) {
        check = false;
      }
    });
    if (check) {
      userInfo.searchHistories = [
        ...userInfo.searchHistories,
        req.body.data.historyData,
      ];
    }
    await accounts.updateOne({ _id: userData.data._id }, userInfo);
    res.json({ status: true });
  }
  //POST user/searchhistories/deleteall
  async searchhistories_delete_all(req, res) {
    let token = req.cookies._token.refeshToken;
    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    userInfo.searchHistories = [];
    await accounts.updateOne({ _id: userData.data._id }, userInfo);
    res.json({ status: true });
  }
  //POST user/notifications/deleteall
  async notifications_delete_all(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    userInfo.notify = [];
    await accounts.updateOne({ _id: userData.data._id }, userInfo);
    res.json({ status: true });
  }
  //POST user/logout
  async logout(req, res) {
    res.clearCookie("_token");
    res.clearCookie("_data");
    await tokens.deleteOne({ refeshToken: req.cookies._token.refeshToken });
    res.json({ isAuth: false });
  }
  //POST user/options
  async options(req, res) {
    let token = req.cookies._token.refeshToken;

    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    res.json({ options: userInfo.options });
  }
  //POST user/options/update
  async options_update(req, res) {
    let token = req.cookies._token.refeshToken;
    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    userInfo.options = req.body.data.data;
    await accounts.updateOne({ _id: userData.data._id }, userInfo);
    res.json({ status: true });
  }
  //POST user/passsword/update
  async password_update(req, res) {
    if (parseInt(req.body.data.newPassword) < 5) {
      res.json({ message: "Mật khẩu quá ngắn!" });
      return;
    }
    let token = req.cookies._token.refeshToken;
    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });

    if (
      req.body.data.password &&
      req.body.data.newPassword &&
      req.body.data.repeatPassword &&
      bcrypt.compareSync(req.body.data.password, userInfo.passWord)
    ) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(req.body.data.newPassword, salt);
      userInfo.passWord = hash;
      await accounts.updateOne({ _id: userInfo._id }, userInfo);
      await tokens.deleteMany({
        userId: userInfo._id,
        refeshToken: { $ne: req.cookies._token.refeshToken },
      });
      res.json({ status: true });
      return;
    }
    res.json({ message: "Thông tin không hợp lệ! Hãy kiểm tra lại!" });
  }
  //POST user/loginhistories
  async login_histories(req, res) {
    let token = req.cookies._token.refeshToken;
    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userTokens = await tokens.find({ userId: userData.data._id });
    res.json({
      data: userTokens.map((item) => {
        let thisDevice = false;
        if (item.refeshToken == req.cookies._token.refeshToken) {
          thisDevice = true;
        }
        return {
          _id: item._id,
          userId: item.userId,
          createdAt: item.createdAt,
          device: item.device,
          thisDevice,
        };
      }),
    });
  }
  //POST user/loginhistories/logout
  async login_histories_logout(req, res) {
    let token = req.cookies._token.refeshToken;
    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    try {
      await tokens.deleteOne({ _id: req.body.data.id, userId: userInfo._id });
      res.json({ status: true });
    } catch {
      res.json({ status: false });
    }
  }
  //POST user/options/twostep/update
  async options_twostep_update(req, res) {
    let token = req.cookies._token.refeshToken;
    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    if (
      req.body.data.password &&
      bcrypt.compareSync(req.body.data.password, userInfo.passWord)
    ) {
      userInfo.options = req.body.data.data;
      await accounts.updateOne({ _id: userInfo._id }, userInfo);
      res.json({ status: true });
    } else {
      res.json({ mess: "Mật khẩu không chính xác!" });
    }
  }
  //POST user/notificationsCount
  async notificationsCount(req, res) {
    let token = req.cookies._token.refeshToken;
    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    res.json({ data: userInfo.notificationsCount });
  }
  //POST user/notificationsCount/update
  async notificationsCount_update(req, res) {
    let token = req.cookies._token.refeshToken;
    const userData = await jwtHelper.verifyToken(
      token,
      process.env.TOKEN_SECRET
    );
    let userInfo = await accounts.findOne({ _id: userData.data._id });
    userInfo.notificationsCount = req.body.data.notificationsCount;
    await accounts.updateOne({ _id: userData.data._id }, userInfo);
    res.json({ status: true });
  }
}
module.exports = new userControllers();
