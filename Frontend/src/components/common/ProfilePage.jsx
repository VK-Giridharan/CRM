import { useEffect, useState } from "react";

import {
    profile,
    updateProfile,
    changePassword
} from "../../services/profileService";

import { PHONE_ERROR_MESSAGE, formatPhoneInput, isPhoneInvalid } from "../../utils/phoneValidation";

// ======================================================
// SHARED PROFILE PAGE
//
// Used by the Employee and Intern profile routes. It follows the same
// layout and the same profileService calls the existing Admin / Manager /
// Team Lead profile pages use - those pages are left untouched.
// ======================================================

function ProfilePage({ accentColor = "blue" }) {

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changing, setChanging] = useState(false);

    const [message, setMessage] = useState({ type: "", text: "" });

    const [profileData, setProfileData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "",
        company_name: "",
        created_at: ""
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const accent =
        accentColor === "teal"
            ? "bg-teal-600 hover:bg-teal-700"
            : "bg-blue-600 hover:bg-blue-700";

    // ================= LOAD =================

    const getProfile = async () => {

        try {

            setLoading(true);

            const response = await profile();

            setProfileData(response.data || {});

        } catch (error) {

            setMessage({
                type: "error",
                text:
                    error.response?.data?.message ||
                    "Unable to load profile"
            });

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        getProfile();

    }, []);

    // ================= HANDLERS =================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setProfileData({
            ...profileData,
            [name]: name === "phone" ? formatPhoneInput(value) : value
        });

    };

    const handlePassword = (e) => {

        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });

    };

    const handleUpdate = async () => {

        try {

            setSaving(true);
            setMessage({ type: "", text: "" });

            const response = await updateProfile({
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                email: profileData.email,
                phone: profileData.phone
            });

            setMessage({
                type: "success",
                text: response.message || "Profile updated"
            });

            await getProfile();

        } catch (error) {

            setMessage({
                type: "error",
                text:
                    error.response?.data?.message ||
                    "Unable to update profile"
            });

        } finally {

            setSaving(false);

        }

    };

    const handleChangePassword = async () => {

        setMessage({ type: "", text: "" });

        if (!passwordData.currentPassword || !passwordData.newPassword) {
            setMessage({
                type: "error",
                text: "Please fill in every password field"
            });
            return;
        }

        if (passwordData.newPassword.length < 8) {
            setMessage({
                type: "error",
                text: "New password must be at least 8 characters"
            });
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({
                type: "error",
                text: "New password and confirmation do not match"
            });
            return;
        }

        try {

            setChanging(true);

            const response = await changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            setMessage({
                type: "success",
                text: response.message || "Password changed"
            });

            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            });

        } catch (error) {

            setMessage({
                type: "error",
                text:
                    error.response?.data?.message ||
                    "Unable to change password"
            });

        } finally {

            setChanging(false);

        }

    };

    if (loading) {
        return (
            <div className="text-center py-20 text-xl font-semibold text-gray-600">
                Loading Profile...
            </div>
        );
    }

    const fullName =
        `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() ||
        "User";

    return (

        <div className="space-y-6">

            <div>

                <h1 className="text-3xl font-bold text-gray-800">
                    My Profile
                </h1>

                <p className="text-gray-500">
                    View and update your profile
                </p>

            </div>

            {message.text && (
                <div
                    className={
                        message.type === "success"
                            ? "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                            : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                    }
                >
                    {message.text}
                </div>
            )}

            {/* PROFILE CARD */}

            <div className="bg-white rounded-xl shadow p-8">

                <div className="flex items-center gap-6 border-b pb-6">

                    <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            fullName
                        )}&background=2563eb&color=fff&size=128`}
                        alt="Profile"
                        className="w-28 h-28 rounded-full border"
                    />

                    <div>

                        <h2 className="text-2xl font-bold">
                            {fullName}
                        </h2>

                        <p className="text-gray-500">
                            {profileData.role || "-"}
                        </p>

                        <p className="text-gray-500">
                            {profileData.company_name || "-"}
                        </p>

                    </div>

                </div>

                <div className="grid md:grid-cols-2 gap-5 mt-8">

                    <div>
                        <label className="font-semibold block mb-2">First Name</label>
                        <input
                            type="text"
                            name="first_name"
                            value={profileData.first_name || ""}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-4 py-3"
                        />
                    </div>

                    <div>
                        <label className="font-semibold block mb-2">Last Name</label>
                        <input
                            type="text"
                            name="last_name"
                            value={profileData.last_name || ""}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-4 py-3"
                        />
                    </div>

                    <div>
                        <label className="font-semibold block mb-2">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={profileData.email || ""}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-4 py-3"
                        />
                    </div>

                    <div>
                        <label className="font-semibold block mb-2">Phone</label>
                        <input
                            type="text"
                            name="phone"
                            inputMode="numeric"
                            maxLength={10}
                            value={profileData.phone || ""}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-4 py-3"
                        />

                        {isPhoneInvalid(profileData.phone) && (
                            <p className="text-red-500 text-sm mt-1">
                                {PHONE_ERROR_MESSAGE}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="font-semibold block mb-2">Role</label>
                        <input
                            type="text"
                            value={profileData.role || "-"}
                            disabled
                            className="w-full border rounded-lg px-4 py-3 bg-gray-100"
                        />
                    </div>

                    <div>
                        <label className="font-semibold block mb-2">Company</label>
                        <input
                            type="text"
                            value={profileData.company_name || "-"}
                            disabled
                            className="w-full border rounded-lg px-4 py-3 bg-gray-100"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="font-semibold block mb-2">Joined On</label>
                        <input
                            type="text"
                            value={
                                profileData.created_at
                                    ? new Date(profileData.created_at).toLocaleDateString()
                                    : "-"
                            }
                            disabled
                            className="w-full border rounded-lg px-4 py-3 bg-gray-100"
                        />
                    </div>

                </div>

                <div className="flex justify-end mt-8">

                    <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className={`${accent} disabled:bg-gray-400 text-white px-8 py-3 rounded-lg`}
                    >
                        {saving ? "Saving..." : "Save Profile"}
                    </button>

                </div>

            </div>

            {/* CHANGE PASSWORD */}

            <div className="bg-white rounded-xl shadow p-8">

                <h2 className="text-2xl font-bold mb-6">
                    Change Password
                </h2>

                <div className="grid md:grid-cols-3 gap-5">

                    <input
                        type="password"
                        name="currentPassword"
                        placeholder="Current Password"
                        value={passwordData.currentPassword}
                        onChange={handlePassword}
                        className="border rounded-lg px-4 py-3"
                    />

                    <input
                        type="password"
                        name="newPassword"
                        placeholder="New Password (min 8)"
                        value={passwordData.newPassword}
                        onChange={handlePassword}
                        className="border rounded-lg px-4 py-3"
                    />

                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={passwordData.confirmPassword}
                        onChange={handlePassword}
                        className="border rounded-lg px-4 py-3"
                    />

                </div>

                <div className="flex justify-end mt-6">

                    <button
                        onClick={handleChangePassword}
                        disabled={changing}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg"
                    >
                        {changing ? "Changing..." : "Change Password"}
                    </button>

                </div>

            </div>

        </div>

    );

}

export default ProfilePage;
