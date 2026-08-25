import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { registerUser } from "../../services/authService";
import { PHONE_ERROR_MESSAGE, formatPhoneInput, isPhoneInvalid } from "../../utils/phoneValidation";

function Register() {

    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
        role: ""
    });

    const navigate = useNavigate();

    const handleRegister = async () => {

    try {

        const response = await registerUser(formData);

        alert(response.message);

        navigate("/login");

    } catch (error) {

        alert(error.response?.data?.message || "Registration Failed");

    }

};

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === "phone" ? formatPhoneInput(value) : value
        });
    };

    return (
<div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">

    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">

        <div className="mb-8 text-center">

            <h1 className="text-3xl font-bold text-blue-700">
                Prodigit CRM
            </h1>

            <p className="mt-2 text-gray-500">
                Create New Account
            </p>

        </div>

        <div className="space-y-5">

            <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                    First Name
                </label>

                <input
                    type="text"
                    name="first_name"
                    placeholder="Enter First Name"
                    autoComplete="off"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />

            </div>

            <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Last Name
                </label>

                <input
                    type="text"
                    name="last_name"
                    placeholder="Enter Last Name"
                    autoComplete="off"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />

            </div>

            <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Email
                </label>

                <input
                    type="email"
                    name="email"
                    placeholder="Enter Email"
                    autoComplete="off"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />

            </div>

            <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Phone Number
                </label>

                <input
                    type="text"
                    name="phone"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter Phone Number"
                    autoComplete="off"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />

                {isPhoneInvalid(formData.phone) && (
                    <p className="text-red-500 text-sm mt-1">
                        {PHONE_ERROR_MESSAGE}
                    </p>
                )}

            </div>

            <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Password
                </label>

                <div className="relative">

                    <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Enter Password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    />

                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-700"
                    >
                        {showPassword ? (
                            <FaEyeSlash size={18} />
                        ) : (
                            <FaEye size={18} />
                        )}
                    </button>

                </div>

            </div>

            {/* <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Role
                </label>

                <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                >
                    <option value="">Select Role</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Employee">Employee</option>
                    <option value="Intern">Intern</option>
                </select>

            </div> */}

            <button
                type="submit"
                className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800"
                onClick={handleRegister}
            >
                Register
            </button>

        </div>

        <div className="mt-6 text-center text-sm text-gray-600">

            Already have an account?{" "}

            <Link
                to="/login"
                className="font-semibold text-blue-700 hover:underline"
            >
                Login
            </Link>

        </div>

    </div>

</div>

    );

}

export default Register;