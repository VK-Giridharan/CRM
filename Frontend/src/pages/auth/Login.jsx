import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/authService";

function Login() {
    const [emailOrPhone, setEmailOrPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            setLoading(true);
            setError("");

            const result = await loginUser({
                emailOrPhone,
                password,
            });

            localStorage.setItem("token", result.token);
            localStorage.setItem("user", JSON.stringify(result.user));

            switch (result.user.role) {

                case "Admin":
                    navigate("/admin");
                    break;

                case "Manager":
                    navigate("/manager");
                    break;

                case "Team Lead":
                    navigate("/teamleader");
                    break;

                case "Employee":
                    navigate("/employee");
                    break;

                case "Intern":
                    navigate("/intern");
                    break;

                default:
                    navigate("/login");
            }
        } catch (err) {
            if (err.response) {
                setError(err.response.data.message);
            } else {
                setError("Server Not Responding");
            }
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
                        Sign in to continue
                    </p>

                </div>

                {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <div className="space-y-5">

                    <div>

                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Email or Phone Number
                        </label>

                        <input
                            type="text"
                            placeholder="Enter Email or Phone Number"
                            autoComplete="off"
                            value={emailOrPhone}
                            onChange={(e) => setEmailOrPhone(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                        />

                    </div>

                    <div>

                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Password
                        </label>

                        <div className="relative">

                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter Password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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

                    <div className="text-center">

                        <Link
                            to="/forgot-password"
                            className="text-sm font-semibold text-blue-700 hover:underline"
                        >
                            Forgot password?
                        </Link>

                    </div>

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {loading ? "Logging In..." : "Login"}
                    </button>

                </div>

                <div className="mt-6 text-center text-sm text-gray-600">

                    Don't have an account?{" "}

                    <Link
                        to="/register"
                        className="font-semibold text-blue-700 hover:underline"
                    >
                        Register
                    </Link>

                </div>

            </div>

        </div>
    );
}

export default Login;