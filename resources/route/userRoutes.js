const express = require("express");
const userControllers = require("../controller/userControllers");
const route = express.Router();
const checkToken = require("../helpers/checkToken.midleware");

route.post(
  "/notificationsCount/update",
  checkToken.checkToken,
  userControllers.notificationsCount_update
);
route.post(
  "/options/towstep/update",
  checkToken.checkToken,
  userControllers.options_twostep_update
);
route.post(
  "/loginhistories/logout",
  checkToken.checkToken,
  userControllers.login_histories_logout
);

route.post(
  "/password/update",
  checkToken.checkToken,
  userControllers.password_update
);
route.post(
  "/options/update",
  checkToken.checkToken,
  userControllers.options_update
);
route.post(
  "/searchhistories/delete",
  checkToken.checkToken,
  userControllers.searchhistories_delete
);
route.post(
  "/searchhistories/deleteall",
  checkToken.checkToken,
  userControllers.searchhistories_delete_all
);
route.post(
  "/searchhistories/add",
  checkToken.checkToken,
  userControllers.searchhistories_add
);
route.post(
  "/message/delete",
  checkToken.checkToken,
  userControllers.message_delete
);
route.post(
  "/notifications/delete",
  checkToken.checkToken,
  userControllers.notifications_delete
);
route.post(
  "/notifications/deleteall",
  checkToken.checkToken,
  userControllers.notifications_delete_all
);
route.post("/logout", userControllers.logout);
route.post("/profile/update", checkToken.checkToken, userControllers.update);
route.post("/profile/friend", checkToken.checkToken, userControllers.friend);
route.post("/profile/search", checkToken.checkToken, userControllers.search);
route.post("/friends", checkToken.checkToken, userControllers.friends);
route.post("/message", checkToken.checkToken, userControllers.message);
route.post("/objId", checkToken.checkToken, userControllers.objId);
route.post("/profile", checkToken.checkToken, userControllers.profile);
route.post(
  "/notifications",
  checkToken.checkToken,
  userControllers.notifications
);
route.post(
  "/searchhistories",
  checkToken.checkToken,
  userControllers.searchhistories
);
route.post("/options", checkToken.checkToken, userControllers.options);
route.post(
  "/loginhistories",
  checkToken.checkToken,
  userControllers.login_histories
);
route.post(
  "/notificationsCount",
  checkToken.checkToken,
  userControllers.notificationsCount
);

module.exports = route;
