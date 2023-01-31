const jwtHelper = require("./jwt.helper");
const tokens = require("../model/token");
let refeshToken = async (tk, rftk) => {
  try {
    const token = await jwtHelper.verifyToken(tk, process.env.TOKEN_SECRET);
    return true;
  } catch {
    try {
      const refeshToken = await jwtHelper.verifyToken(
        rftk,
        process.env.TOKEN_SECRET
      );
      let token = await jwtHelper.generateTokenLogin(
        refeshToken.data,
        process.env.TOKEN_SECRET,
        process.env.ACCESS_TOKELIFE
      );
      const checkToken = await tokens.findOne({ refeshToken: rftk });
      if (checkToken) {
        return {
          refeshToken: {
            token,
            refeshToken: rftk,
            isAuth: true,
          },
        };
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }
};

module.exports = {
  refeshToken: refeshToken,
};
