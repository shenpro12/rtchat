const jwt = require("jsonwebtoken");

let generateTokenLogin = (user, secretSignature, tokenLife) => {
  return new Promise((resolve, reject) => {
    // Định nghĩa những thông tin của user lưu vào token
    const userData = {
      _id: user._id,
      userName: user.userName,
      image: user.image,
      friends: user.friends,
      info: user.info,
      isAuth: true,
    };
    // Ký và tạo token
    jwt.sign(
      { data: userData },
      secretSignature,
      {
        algorithm: "HS256",
        expiresIn: tokenLife,
      },
      (error, token) => {
        if (error) {
          return reject(error);
        }
        resolve(token);
      }
    );
  });
};
let generateTokenSignin = (user, secretSignature, tokenLife) => {
  return new Promise((resolve, reject) => {
    // Định nghĩa những thông tin của user lưu vào token
    const userData = {
      userName: user.userName,
      passWord: user.passWord,
    };
    // Ký và tạo token
    jwt.sign(
      { data: userData },
      secretSignature,
      {
        algorithm: "HS256",
        expiresIn: tokenLife,
      },
      (error, token) => {
        if (error) {
          return reject(error);
        }
        resolve(token);
      }
    );
  });
};
let generateTokenResetpassword = (user, secretSignature, tokenLife) => {
  return new Promise((resolve, reject) => {
    // Định nghĩa những thông tin của user lưu vào token
    const userData = {
      userName: user.userName,
      userId: user.userId,
    };
    // Ký và tạo token
    jwt.sign(
      { data: userData },
      secretSignature,
      {
        algorithm: "HS256",
        expiresIn: tokenLife,
      },
      (error, token) => {
        if (error) {
          return reject(error);
        }
        resolve(token);
      }
    );
  });
};
let verifyToken = (token, secretKey) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        return reject(error);
      }
      resolve(decoded);
    });
  });
};

module.exports = {
  generateTokenLogin: generateTokenLogin,
  generateTokenSignin: generateTokenSignin,
  generateTokenResetpassword: generateTokenResetpassword,
  verifyToken: verifyToken,
};
