const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ======================================================
// SECURE FILE UPLOAD
//
// Used only by the task report workflow (Employee / Intern attaching
// evidence to a submitted report).
//
// Safety properties:
//   * The stored filename is generated from crypto.randomBytes - the
//     client-supplied name is NEVER used to build a path, so path traversal
//     ("../../server.js", "a\0.png", absolute paths) is impossible.
//   * The extension is taken from a MIME whitelist, not from the upload, so
//     an executable cannot be written even if the client claims otherwise.
//   * Size limit is configurable via MAX_UPLOAD_SIZE_MB and enforced by
//     multer before the file is fully buffered.
//   * Exactly one file per request is accepted.
// ======================================================

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// MIME type -> canonical extension. Anything not listed is rejected.
// Deliberately excludes every executable/script container.
const ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx"
};

const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB) || 2;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },

    filename: (req, file, cb) => {
        // Extension comes from the whitelist, never from file.originalname.
        const extension = ALLOWED_MIME_TYPES[file.mimetype];
        const safeName = crypto.randomBytes(16).toString("hex") + extension;
        cb(null, safeName);
    }

});

const fileFilter = (req, file, cb) => {

    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
        const error = new Error(
            "Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, TXT, CSV, DOC, DOCX, XLS, XLSX"
        );
        error.code = "UNSUPPORTED_FILE_TYPE";
        return cb(error);
    }

    cb(null, true);

};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES,
        files: 1
    }
});

// ------------------------------------------------------
// Wrap multer so its errors become clean 400s instead of
// bubbling to the generic error handler as 500s.
// ------------------------------------------------------
const uploadSingle = (fieldName) => {

    const handler = upload.single(fieldName);

    return (req, res, next) => {

        handler(req, res, (error) => {

            if (!error) {
                return next();
            }

            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: `File is too large. Maximum size is ${MAX_UPLOAD_SIZE_MB}MB`
                });
            }

            if (error.code === "UNSUPPORTED_FILE_TYPE") {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.code === "LIMIT_FILE_COUNT" ||
                error.code === "LIMIT_UNEXPECTED_FILE") {
                return res.status(400).json({
                    success: false,
                    message: "Only one file may be uploaded"
                });
            }

            return res.status(400).json({
                success: false,
                message: "File upload failed"
            });

        });

    };

};

// Remove an uploaded file when the surrounding request fails after the
// upload already landed on disk, so rejected requests leave no orphans.
const removeUploadedFile = (file) => {

    if (!file || !file.filename) {
        return;
    }

    const target = path.join(UPLOAD_DIR, path.basename(file.filename));

    fs.unlink(target, () => {
        // Best effort - a failed cleanup must never break the response.
    });

};

module.exports = {
    uploadSingle,
    removeUploadedFile,
    UPLOAD_DIR,
    ALLOWED_MIME_TYPES,
    MAX_UPLOAD_SIZE_MB
};
