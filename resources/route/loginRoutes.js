const express = require("express");
const loginControllers = require("../controller/loginControllers");
const route = express.Router();

route.get("/signin/verify/:token", loginControllers.verifySignin);
route.get("/resetpassword/verify/:token", loginControllers.verifyResetpassword);
route.post("/login/secure", loginControllers.login_secure);
route.post("/resetpassword/verify/:token", loginControllers.doResetpassword);
route.post("/login", loginControllers.login);
route.post("/signin", loginControllers.signin);
route.post("/resetpassword", loginControllers.resetpassword);

module.exports = route;
