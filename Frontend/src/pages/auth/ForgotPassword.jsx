import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../../services/authService";

// ======================================================
// FORGOT PASSWORD
//
// The backend intentionally returns the same generic message whether or not
// the address is registered, so this screen must not imply either outcome.
// ======================================================

function ForgotPassword() {

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [message, setMessage] = useState("");
    const [devToken, setDevToken] = useState("");

    const handleSubmit = async (event) => {

        event.preventDefault();

        if (!email.trim()) {
            setMessage("Please enter your email address");
            return;
        }

        try {

            setLoading(true);
            setMessage("");
            setDevToken("");

            const response = await forgotPassword(email.trim());

            setSent(true);

            setMessage(
                response.message ||
                "If an account exists for that email, a password reset link has been generated."
            );

            // Only present when the backend is explicitly running with
            // ALLOW_RESET_TOKEN_IN_RESPONSE=true outside production.
            if (response.dev_only_reset_token) {
                setDevToken(response.dev_only_reset_token);
            }

        } catch (error) {

            // Even on failure, do not reveal anything about the address.
            setSent(true);

            setMessage(
                "If an account exists for that email, a password reset link has been generated."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

                <div className="text-center mb-8">

                    <h1 className="text-3xl font-bold text-blue-700">
                        Prodigit CRM
                    </h1>

                    <p className="text-gray-500 mt-2">
                        Reset your password
                    </p>

                </div>

                {message && (
                    <div
                        className={
                            sent
                                ? "mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
                                : "mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                        }
                    >
                        {message}
                    </div>
                )}

                {devToken && (
                    <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 break-all">

                        <p className="font-semibold mb-1">
                            Development mode &mdash; reset token
                        </p>

                        <p className="mb-2">{devToken}</p>

                        <Link
                            to={`/reset-password?token=${devToken}`}
                            className="font-semibold text-blue-700 hover:underline"
                        >
                            Continue to reset password
                        </Link>

                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    <div>

                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Email
                        </label>

                        <input
                            type="email"
                            placeholder="Enter your account email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                        />

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>

                </form>

                <div className="mt-6 text-center text-sm text-gray-600">

                    Remembered your password?{" "}

                    <Link
                        to="/login"
                        className="font-semibold text-blue-700 hover:underline"
                    >
                        Back to Login
                    </Link>

                </div>

            </div>

        </div>

    );

}

export default ForgotPassword;
