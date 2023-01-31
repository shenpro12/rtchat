const refeshTokenHelper = require("../helpers/refeshToken.helper");
const jwtHelper = require("../helpers/jwt.helper");
class tokenControllers {
  async verify(req, res) {
    try {
      const token = await refeshTokenHelper.refeshToken(
        req.cookies._token.token,
        req.cookies._token.refeshToken
      );
      if (token.refeshToken) {
        const userData = await jwtHelper.verifyToken(
          token.refeshToken.token,
          process.env.TOKEN_SECRET
        );

        res.clearCookie("_token");
        res.clearCookie("_data");
        res.cookie(
          "_data",
          {
            userName: userData.data.userName,
            _id: userData.data._id,
            friends: userData.data.friends,
          },
          {
            expires: new Date(Date.now() + 2592000000),
            secure: true,
          }
        );
        res.cookie(
          "_token",
          {
            token: token.refeshToken.token,
            refeshToken: req.cookies._token.refeshToken,
          },
          {
            expires: new Date(Date.now() + 2592000000),
            httpOnly: true,
            secure: true,
          }
        );
        res.json({ isAuth: true });
      } else if (token) {
        res.json({ isAuth: true });
        console.log("still login");
      } else {
        res.clearCookie("_data");
        res.clearCookie("_token");
        res.json({ isAuth: false });
      }
    } catch {
      res.clearCookie("_data");
      res.clearCookie("_token");
      res.json({ isAuth: false });
      console.log("delete token");
    }
  }
}
module.exports = new tokenControllers();
