// ======================================================
// SHARED INPUT VALIDATION
//
// The A-Z test report found the same three defects repeated across almost
// every controller:
//
//   1. Fields the frontend validates were not validated at all server-side
//      (phone above all), so a direct API call could store anything.
//   2. Malformed input reached PostgreSQL and the driver's cast error
//      surfaced as a generic HTTP 500 instead of a 400.
//   3. Over-length values overflowed varchar columns, again as a 500.
//
// These helpers are deliberately small and dependency-free, and they mirror
// the rules the frontend already enforces so the two cannot drift apart.
// ======================================================

// Matches the existing EMAIL_PATTERN already used in authController.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors Frontend/src/utils/phoneValidation.js: digits only, exactly 10.
const PHONE_DIGITS = 10;

// Column widths in the live schema. Values longer than these previously
// reached Postgres and raised "value too long for type character varying".
const MAX_NAME = 100;
const MAX_EMAIL = 150;
const MAX_PHONE = 20;
const MAX_TEXT = 5000;
const MAX_SHORT_TEXT = 255;

const MIN_PASSWORD_LENGTH = 8;

// ------------------------------------------------------
// Generic helpers
// ------------------------------------------------------

// Anything that is not a primitive string/number is rejected outright.
// This is what stopped `password: ["a","b"]` from reaching bcrypt and
// throwing a 500 out of the login handler.
const isScalar = (value) =>
    typeof value === "string" || typeof value === "number";

const asTrimmedString = (value) => {
    if (value === null || value === undefined) return "";
    if (!isScalar(value)) return null;          // null signals "wrong type"
    return String(value).trim();
};

// ------------------------------------------------------
// Identifiers
//
// Returns a positive integer, or null when the value cannot be one.
// Callers turn null into a 400 instead of letting Postgres raise
// "invalid input syntax for type integer".
// ------------------------------------------------------
const parseId = (value) => {

    if (value === null || value === undefined || value === "") return null;
    if (!isScalar(value)) return null;

    const raw = String(value).trim();

    // Reject "1abc", "1.5", "1e3", " 1 2", "-1", "0"
    if (!/^\d+$/.test(raw)) return null;

    const id = Number(raw);

    if (!Number.isSafeInteger(id) || id <= 0) return null;

    return id;

};

// ------------------------------------------------------
// Names / free text
// ------------------------------------------------------

// A name must be a non-empty string AFTER trimming (the old code checked
// `!first_name` before trimming, so "   " passed), must not be a bare
// number, and must fit the column.
const validateName = (value, label = "Name", { required = true } = {}) => {

    const text = asTrimmedString(value);

    if (text === null) return `${label} must be text`;

    if (!text) {
        return required ? `${label} is required` : null;
    }

    if (typeof value === "number") return `${label} must be text`;

    if (text.length > MAX_NAME) {
        return `${label} must be ${MAX_NAME} characters or fewer`;
    }

    return null;

};

const validateText = (value, label, max = MAX_TEXT) => {

    if (value === null || value === undefined || value === "") return null;

    const text = asTrimmedString(value);

    if (text === null) return `${label} must be text`;

    if (text.length > max) {
        return `${label} must be ${max} characters or fewer`;
    }

    return null;

};

const validateShortText = (value, label) =>
    validateText(value, label, MAX_SHORT_TEXT);

// ------------------------------------------------------
// Email
// ------------------------------------------------------
const validateEmail = (value, { required = true, label = "Email" } = {}) => {

    const text = asTrimmedString(value);

    if (text === null) return `${label} must be text`;

    if (!text) {
        return required ? `${label} is required` : null;
    }

    if (text.length > MAX_EMAIL) {
        return `${label} must be ${MAX_EMAIL} characters or fewer`;
    }

    if (!EMAIL_PATTERN.test(text)) {
        return "Please enter a valid email address";
    }

    return null;

};

// ------------------------------------------------------
// Phone
//
// Exactly 10 digits, digits only - the same rule the Register and Profile
// screens already enforce client-side.
// ------------------------------------------------------
const validatePhone = (value, { required = true, label = "Phone number" } = {}) => {

    const text = asTrimmedString(value);

    if (text === null) return `${label} must be text`;

    if (!text) {
        return required ? `${label} is required` : null;
    }

    if (text.length > MAX_PHONE) {
        return `${label} must be exactly ${PHONE_DIGITS} digits`;
    }

    if (!/^\d+$/.test(text)) {
        return `${label} must contain digits only`;
    }

    if (text.length !== PHONE_DIGITS) {
        return `${label} must be exactly ${PHONE_DIGITS} digits`;
    }

    return null;

};

// ------------------------------------------------------
// Password
//
// Length was already enforced. The report flagged that "12345678" was
// accepted, so a light complexity rule is added: at least one letter and
// at least one digit. Deliberately not stricter than that - existing
// passwords are never re-validated, only new ones.
// ------------------------------------------------------
const validatePassword = (value, label = "Password") => {

    if (typeof value !== "string") return `${label} must be text`;

    if (value.length < MIN_PASSWORD_LENGTH) {
        return `${label} must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (value.length > 200) {
        return `${label} must be 200 characters or fewer`;
    }

    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
        return `${label} must contain at least one letter and one number`;
    }

    return null;

};

// ------------------------------------------------------
// Dates and times
//
// Validated in the application so an invalid value never reaches Postgres
// as a failed cast (which previously became a 500).
// ------------------------------------------------------

// Accepts YYYY-MM-DD, and also the full ISO form the frontend sometimes
// sends, and verifies the date genuinely exists ("2026-13-45" is rejected,
// so is "2026-02-30").
const parseDateOnly = (value) => {

    const text = asTrimmedString(value);

    if (!text) return null;

    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(text);

    if (!match) return null;

    const [, y, m, d] = match;

    const year = Number(y);
    const month = Number(m);
    const day = Number(d);

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    // Round-trip through UTC so the calendar day cannot shift.
    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day) {
        return null;
    }

    // Always hand Postgres a clean YYYY-MM-DD.
    return `${y}-${m}-${d}`;

};

const validateDate = (value, label = "Date", { required = false } = {}) => {

    if (value === null || value === undefined || value === "") {
        return required ? `${label} is required` : null;
    }

    if (!parseDateOnly(value)) {
        return `${label} must be a valid date in YYYY-MM-DD format`;
    }

    return null;

};

// Accepts HH:MM or HH:MM:SS on a 24-hour clock.
const parseTimeOnly = (value) => {

    const text = asTrimmedString(value);

    if (!text) return null;

    const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);

    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = match[3] === undefined ? 0 : Number(match[3]);

    if (hours > 23 || minutes > 59 || seconds > 59) return null;

    const pad = (n) => String(n).padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

};

const validateTime = (value, label = "Time", { required = false } = {}) => {

    if (value === null || value === undefined || value === "") {
        return required ? `${label} is required` : null;
    }

    if (!parseTimeOnly(value)) {
        return `${label} must be a valid time in HH:MM format`;
    }

    return null;

};

// Returns an error when `end` is strictly before `start`. Both must already
// have passed validateDate.
const validateDateOrder = (start, end, startLabel = "Start date", endLabel = "Due date") => {

    const s = parseDateOnly(start);
    const e = parseDateOnly(end);

    if (!s || !e) return null;

    if (e < s) {
        return `${endLabel} cannot be earlier than ${startLabel.toLowerCase()}`;
    }

    return null;

};

// ------------------------------------------------------
// Runs a list of [value, validatorFn] pairs and returns the first error.
// Keeps controllers to a single `if (error) return 400`.
// ------------------------------------------------------
const firstError = (checks) => {

    for (const error of checks) {
        if (error) return error;
    }

    return null;

};

module.exports = {
    EMAIL_PATTERN,
    MIN_PASSWORD_LENGTH,
    PHONE_DIGITS,
    isScalar,
    asTrimmedString,
    parseId,
    validateName,
    validateText,
    validateShortText,
    validateEmail,
    validatePhone,
    validatePassword,
    parseDateOnly,
    parseTimeOnly,
    validateDate,
    validateTime,
    validateDateOrder,
    firstError
};
