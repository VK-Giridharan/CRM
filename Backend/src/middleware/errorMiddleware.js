// ======================================================
// GLOBAL ERROR HANDLER
//
// Logs the full error server-side but returns only a safe message to the
// client. Internal details (SQL text, stack traces, JWT internals, driver
// error codes) are never sent in the response.
// ======================================================

const errorHandler = (err, req, res, next) => {

    console.error("UNHANDLED ERROR:", err.message);

    const status = err.status || err.statusCode || 500;

    // 4xx errors raised deliberately by our own middleware carry a message
    // that is safe to show. Anything 5xx is reported generically.
    const message =
        status < 500 && err.message
            ? err.message
            : "Internal Server Error";

    res.status(status).json({
        success: false,
        message
    });

};

module.exports = errorHandler;
