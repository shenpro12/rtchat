const refeshTokenHelper = require("../helpers/refeshToken.helper");
const jwtHelper = require("../helpers/jwt.helper");
let checkToken = async (req, res, next) => {
  try {
    const token = await refeshTokenHelper.refeshToken(
      req.cookies._token.token,
      req.cookies._token.refeshToken
    );
    if (token) {
      if (token.refeshToken) {
        res.clearCookie("_token");
        res.clearCookie("_data");
        res.cookie(
          "_token",
          {
            token: token.refeshToken.token,
            refeshToken: token.refeshToken.refeshToken,
          },
          {
            expires: new Date(Date.now() + 2592000000),
            httpOnly: true,
            secure: true,
          }
        );
        const userData = await jwtHelper.verifyToken(
          token.refeshToken.token,
          process.env.TOKEN_SECRET
        );
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
      }
      next();
    } else {
      res.clearCookie("_data");
      res.clearCookie("_token");
      res.json({ isAuth: false });
    }
  } catch {
    res.clearCookie("_data");
    res.clearCookie("_token");
    res.json({ isAuth: false });
  }
};

module.exports = {
  checkToken: checkToken,
};
