// verifyToken previously duplicated authMiddleware but called jwt.verify
// without a try/catch, so an expired or tampered token threw and Express
// surfaced it as a 500 with the raw JWT error message.
//
// Both names now resolve to the single hardened implementation so the two
// cannot drift apart again. Existing `require("../middleware/verifyToken")`
// imports keep working unchanged.

module.exports = require("./authMiddleware");
