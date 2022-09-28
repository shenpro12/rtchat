const accounts = require("../model/account");
const tokens = require("../model/token");
const jwtHelper = require("../helpers/jwt.helper");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
class loginControllers {
  //POST account/login/secure
  async login_secure(req, res) {
    if (!req.body.data.code) {
      res.json({ mess: "Hãy nhập đầy đủ thông tin!" });
      return;
    }
    const account = await accounts.findOne({
      userName: req.body.data.userName,
    });
    let code = account.trustCode;
    let check = false;
    code.map((item) => {
      //console.log(item);
      if (
        bcrypt.compareSync(req.body.data.code, item.code) &&
        item.exp >= Date.now()
      ) {
        check = true;
      }
    });
    if (check) {
      account.trustCode = code.filter((item) => {
        if (
          bcrypt.compareSync(req.body.data.code, item.code) ||
          item.exp <= Date.now()
        ) {
          return false;
        }
        return true;
      });
      await accounts.updateOne({ _id: account._id }, account);
      let token = await jwtHelper.generateTokenLogin(
        account,
        process.env.TOKEN_SECRET,
        process.env.ACCESS_TOKELIFE
      );
      let refeshToken = await jwtHelper.generateTokenLogin(
        account,
        process.env.TOKEN_SECRET,
        process.env.REFESH_TOKENLIFE
      );
      res.cookie(
        "_token",
        { token, refeshToken },
        {
          expires: new Date(Date.now() + 2592000000),
          httpOnly: true,
          secure: true,
        }
      );
      res.cookie(
        "_data",
        {
          userName: account.userName,
          _id: account._id,
          friends: account.friends,
        },
        {
          expires: new Date(Date.now() + 2592000000),
          secure: true,
        }
      );
      let tk = new tokens({
        userId: account._id,
        refeshToken,
        device: req.body.data.device,
        createdAt: Date.now(),
      });
      await tk.save();
      res.json({ isAuth: true });
    } else {
      res.json({ mess: "Mã không hợp lệ!" });
    }
  }
  //POST account/login
  async login(req, res) {
    if (!req.body.data.passWord && !req.body.data.userName) {
      res.json({ mess: "Hãy nhập đầy đủ thông tin!" });
      return;
    }
    const account = await accounts.findOne({
      userName: req.body.data.userName,
    });

    if (
      account &&
      bcrypt.compareSync(req.body.data.passWord, account.passWord)
    ) {
      if (!account.options.twoStep) {
        let token = await jwtHelper.generateTokenLogin(
          account,
          process.env.TOKEN_SECRET,
          process.env.ACCESS_TOKELIFE
        );
        let refeshToken = await jwtHelper.generateTokenLogin(
          account,
          process.env.TOKEN_SECRET,
          process.env.REFESH_TOKENLIFE
        );
        res.cookie(
          "_token",
          { token, refeshToken },
          {
            expires: new Date(Date.now() + 2592000000),
            httpOnly: true,
            secure: true,
          }
        );
        res.cookie(
          "_data",
          {
            userName: account.userName,
            _id: account._id,
            friends: account.friends,
          },
          {
            expires: new Date(Date.now() + 2592000000),
            secure: true,
          }
        );
        let tk = new tokens({
          userId: account._id,
          refeshToken,
          device: req.body.data.device,
          createdAt: Date.now(),
        });
        await tk.save();
        res.json({ isAuth: true });
        return;
      } else {
        let code = (
          Math.floor(Math.random() * (1000000 - 99999)) + 99999
        ).toString();
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(code, salt);
        account.trustCode.push({
          code: hash,
          exp: Date.now() + 300000,
        });
        await accounts.updateOne({ _id: account._id }, account);
        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.Email,
            pass: process.env.pass,
          },
        });

        let mailOptions = {
          from: process.env.Email,
          to: account.userName,
          subject: "Mã đăng nhập tài khoản RTchat",
          text: code,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
        let temp = account.trustCode;
        account.trustCode = temp.filter((item) => {
          if (item.exp <= Date.now()) {
            return false;
          }
          return true;
        });
        await accounts.updateOne({ _id: account._id }, account);
        res.json({
          verify: {
            userName: account.userName.replace(
              account.userName.slice(1, account.userName.indexOf("@", 0)),
              "***"
            ),
          },
        });
        return;
      }
    }
    res.json({ mess: "Thông tin tài khoản sai! Hãy nhập lại thông tin!" });
  }
  //POST account/signin
  async signin(req, res) {
    if (
      req.body.data.userName &&
      req.body.data.password &&
      req.body.data.repeatPassword
    ) {
      const account = await accounts.findOne({
        userName: req.body.data.userName,
      });
      if (account) {
        res.json({ mess: "Email đã được đăng ký tài khoản!", status: false });
        return;
      } else if (req.body.data.password.length < 5) {
        res.json({ mess: "Mật khẩu quá ngắn!", status: false });
        return;
      } else if (req.body.data.password != req.body.data.repeatPassword) {
        res.json({ mess: "Mật khẩu không khớp!", status: false });
        return;
      } else {
        let accountInfo = {
          userName: req.body.data.userName,
          passWord: req.body.data.password,
        };
        let token = await jwtHelper.generateTokenSignin(
          accountInfo,
          process.env.TOKEN_SECRET,
          process.env.ACCESS_TOKELIFE
        );
        let link = `${process.env.host}/account/signin/verify/${token}`;
        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.Email,
            pass: process.env.pass,
          },
        });

        let mailOptions = {
          from: process.env.Email,
          to: req.body.data.userName,
          subject: "Email kích hoạt tài khoản RTchat",
          html: `<p style="font-weight:bold">Đây là URL kích hoạt tài khoản RTchat của bạn, thời hạn 10 phút. Nếu bạn không phải người yêu cầu đăng ký tài khoản này vui lòng bỏ qua tin nhắn này!</p><p>URL: <a href=${link}>${link}</a></p>`,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
        res.json({
          mess: "Hãy kiểm tra Email để kích hoạt tài khoản!",
          status: true,
        });
        return;
      }
    }
    res.json({ mess: "Hãy nhập đầy đủ thông tin tài khoản!", status: false });
  }
  //GET account/signin/verify/:token
  async verifySignin(req, res) {
    try {
      const tokenInfo = await jwtHelper.verifyToken(
        req.params.token,
        process.env.TOKEN_SECRET
      );
      const account = await accounts.findOne({
        userName: tokenInfo.data.userName,
      });
      if (tokenInfo && !account) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(tokenInfo.data.passWord, salt);
        const user = new accounts({
          userName: tokenInfo.data.userName,
          passWord: hash,
          image: "",
          friends: [],
          info: {
            name: "",
            phone: "",
            gender: "",
            birthday: "",
          },
          notify: [],
          trustCode: [],
          options: {
            info: true,
            message: false,
            search: true,
            twoStep: false,
          },
          notificationsCount: { notify: 0, message: 0 },
          allowMessage: [],
        });
        user.save();
        res.render("successToken", {
          status: "Kích hoạt tài khoản thành công!",
        });
      } else {
        res.render("errToken", {
          status: "URL hết hạn!",
        });
      }
    } catch {
      res.render("errToken", {
        status: "URL hết hạn!",
      });
    }
  }
  //POST /account/resetpassword
  async resetpassword(req, res) {
    const pattern = /[A-Z0-9._%+-]+@[A-Z0-9-]+.+.[A-Z]{2,4}/gim;
    if (req.body.data.userName && pattern.test(req.body.data.userName)) {
      const account = await accounts.findOne({
        userName: req.body.data.userName,
      });
      if (account) {
        let accountInfo = {
          userName: account.userName,
          userId: account._id,
        };
        let token = await jwtHelper.generateTokenResetpassword(
          accountInfo,
          process.env.TOKEN_SECRET,
          process.env.ACCESS_TOKELIFE
        );
        let link = `${process.env.host}/account/resetpassword/verify/${token}`;
        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.Email,
            pass: process.env.pass,
          },
        });

        let mailOptions = {
          from: process.env.Email,
          to: req.body.data.userName,
          subject: "Email reset mật khẩu tài khoản RTchat",
          html: `<p style="font-weight:bold">Đây là URL reset mật khẩu tài khoản RTchat của bạn, thời hạn 10 phút. Nếu bạn không phải người thực hiện yêu cầu này vui lòng bỏ qua tin nhắn này!</p><p>URL: <a href=${link}>${link}</a></p>`,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
        res.json({
          mess: "Hãy kiểm tra Email để đặt lại mật khẩu!",
          status: true,
        });
      } else {
        res.json({
          mess: "Tài khoản không tồn tại!",
          status: false,
        });
      }
    }
  }
  //GET /account/resetpassword/verify/:token
  async verifyResetpassword(req, res) {
    try {
      const tokenInfo = await jwtHelper.verifyToken(
        req.params.token,
        process.env.TOKEN_SECRET
      );
      res.render("resetPassword", {
        token: req.params.token,
      });
    } catch {
      res.render("errToken", {
        status: "URL hết hạn!",
      });
    }
  }
  // POST account/resetpassword/verify/:token
  async doResetpassword(req, res) {
    try {
      const tokenInfo = await jwtHelper.verifyToken(
        req.params.token,
        process.env.TOKEN_SECRET
      );
      if (
        tokenInfo &&
        req.body.password &&
        req.body.repeatPassword &&
        req.body.password == req.body.repeatPassword
      ) {
        const account = await accounts.findOne({
          userName: tokenInfo.data.userName,
        });
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);
        account.passWord = hash;
        await accounts.updateOne(
          { userName: tokenInfo.data.userName },
          account
        );
        await tokens.deleteMany({ userId: tokenInfo.data.userId });
        res.render("successToken", {
          status: "Thay đổi mật khẩu thành công!",
        });
        return;
      }
      res.render("resetPassword", {
        status: "Thông tin không chính xác! hãy nhập lại thông tin!",
        token: req.params.token,
      });
    } catch {
      res.render("errToken", {
        status: "URL hết hạn!",
      });
    }
  }
}
module.exports = new loginControllers();
