// ======================================================
// DATE FORMATTING
//
// The A-Z test report (BUG-013) found dates rendering as raw ISO strings and
// one calendar day early, e.g. a meeting saved as 2026-10-15 showing as
// "2026-10-14T18:30:00.000Z".
//
// The backend now returns DATE columns as plain 'YYYY-MM-DD' text (see
// Backend/src/database/connection.js), so a date-only value must be
// formatted WITHOUT going through the Date constructor - parsing
// "2026-10-15" yields UTC midnight, and rendering that in a negative-offset
// timezone would move it back a day again.
//
// TIMESTAMP values (created_at, submitted_at, ...) still carry a real time
// and are converted normally.
// ======================================================

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Formats a date-only value ('YYYY-MM-DD') or a full timestamp as a local
// calendar date. Returns "-" for anything empty or unparseable.
export const formatDate = (value) => {

    if (!value) return "-";

    const text = String(value);

    // Date-only: format the parts directly, no timezone conversion.
    const dateOnly = DATE_ONLY.exec(text);

    if (dateOnly) {
        const [, year, month, day] = dateOnly;
        return new Date(Number(year), Number(month) - 1, Number(day))
            .toLocaleDateString();
    }

    const parsed = new Date(text);

    return Number.isNaN(parsed.getTime())
        ? "-"
        : parsed.toLocaleDateString();

};

// Formats a timestamp as local date + time.
export const formatDateTime = (value) => {

    if (!value) return "-";

    const parsed = new Date(String(value));

    return Number.isNaN(parsed.getTime())
        ? "-"
        : parsed.toLocaleString();

};

// Produces the 'YYYY-MM-DD' string an <input type="date"> expects.
export const toDateInputValue = (value) => {

    if (!value) return "";

    const text = String(value);

    if (DATE_ONLY.test(text)) return text;

    const parsed = new Date(text);

    if (Number.isNaN(parsed.getTime())) return "";

    // Use local parts so the input shows the same day the user sees.
    const pad = (n) => String(n).padStart(2, "0");

    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;

};
