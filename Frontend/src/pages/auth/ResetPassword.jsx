import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { resetPassword } from "../../services/authService";

// ======================================================
// RESET PASSWORD
//
// The token arrives as ?token=... The backend hashes it, verifies it is
// unused and unexpired, updates the password with bcrypt, then consumes the
// token so it cannot be replayed.
// ======================================================

const MIN_PASSWORD_LENGTH = 8;

function ResetPassword() {

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [token, setToken] = useState(searchParams.get("token") || "");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");
        setSuccess("");

        if (!token.trim()) {
            setError("Reset token is missing. Please use the link you were given.");
            return;
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {

            setLoading(true);

            const response = await resetPassword({
                token: token.trim(),
                newPassword
            });

            setSuccess(
                response.message ||
                "Password has been reset. You can now log in."
            );

            setNewPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "This reset link is invalid or has expired"
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
                        Choose a new password
                    </p>

                </div>

                {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Shown only when the link did not carry a token. */}
                    {!searchParams.get("token") && (

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Reset Token
                            </label>

                            <input
                                type="text"
                                placeholder="Paste your reset token"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                            />

                        </div>

                    )}

                    <div>

                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                            New Password
                        </label>

                        <div className="relative">

                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
                            >
                                {showPassword ? (
                                    <FaEyeSlash size={18} />
                                ) : (
                                    <FaEye size={18} />
                                )}
                            </button>

                        </div>

                    </div>

                    <div>

                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Confirm New Password
                        </label>

                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Re-enter your new password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                        />

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>

                </form>

                <div className="mt-6 text-center text-sm text-gray-600">

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

export default ResetPassword;
