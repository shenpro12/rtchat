const loginRoute = require("./loginRoutes");
const tokenRoute = require("./tokenRoutes");
const userRoute = require("./userRoutes");
function route(app) {
  app.use("/account", loginRoute);
  app.use("/token", tokenRoute);
  app.use("/user", userRoute);
}
module.exports = route;
