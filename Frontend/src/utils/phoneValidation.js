// ======================================================
// PHONE NUMBER VALIDATION
//
// Shared helpers used by every phone number input in the app so the
// same rule applies everywhere: digits only, maximum 10 digits.
// ======================================================

export const PHONE_ERROR_MESSAGE = "Phone number must be exactly 10 digits";

// Removes every non digit character and caps the value at 10 digits.
export const formatPhoneInput = (value) =>
    String(value ?? "").replace(/\D/g, "").slice(0, 10);

// An empty field shows no error - only an incomplete entry is invalid.
export const isPhoneInvalid = (value) => {

    const digits = formatPhoneInput(value);

    return digits.length > 0 && digits.length < 10;

};
