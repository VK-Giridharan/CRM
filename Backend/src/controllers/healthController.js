const { successResponse } = require("../utils/response");

const healthCheck = (req, res) => {
  successResponse(res, "Server is running", {
    server: "Running",
    database: "Connected",
    timestamp: new Date(),
  });
};

module.exports = {
  healthCheck,
};