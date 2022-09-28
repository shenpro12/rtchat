const express = require("express");
const tokenControllers = require("../controller/tokenControllers");
const route = express.Router();

route.post("/verify", tokenControllers.verify);

module.exports = route;
