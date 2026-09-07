// ======================================================
// 404 HANDLER
//
// The previous version echoed the raw request URL back into the response
// body ("Route Not Found - /api/v1/<whatever the caller sent>"), which
// reflected unvalidated user input (report BUG-022).
//
// The path is still logged server-side, where it is useful for spotting a
// broken client, but it is no longer returned to the caller.
// ======================================================

const notFound = (req, res) => {

  console.warn(`404 - ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    message: "Route Not Found"
  });

};

module.exports = notFound;
