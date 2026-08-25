import { useEffect, useState } from "react";

import {
    profile,
    updateProfile,
    changePassword
} from "../../services/profileService";

import { PHONE_ERROR_MESSAGE, formatPhoneInput, isPhoneInvalid } from "../../utils/phoneValidation";

function TeamLeaderProfile() {

    // ================= STATES =================

    const [loading, setLoading] = useState(true);

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

    // ================= GET PROFILE =================

    const getProfile = async () => {

        try {

            setLoading(true);

            const response = await profile();

            console.log("TEAM LEADER PROFILE:", response.data);

            setProfileData(response.data);

        } catch (error) {

            console.log("PROFILE ERROR:", error);

        } finally {

            setLoading(false);

        }

    };

    // ================= HANDLE PROFILE =================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setProfileData({

            ...profileData,

            [name]: name === "phone" ? formatPhoneInput(value) : value

        });

    };

    // ================= HANDLE PASSWORD =================

    const handlePassword = (e) => {

        setPasswordData({

            ...passwordData,

            [e.target.name]: e.target.value

        });

    };

    // ================= UPDATE PROFILE =================

    const handleUpdate = async () => {

        try {

            const response = await updateProfile(profileData);

            alert(response.message);

            getProfile();

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Profile update failed"
            );

        }

    };

    // ================= CHANGE PASSWORD =================

    const handleChangePassword = async () => {

        if (!passwordData.currentPassword) {

            return alert("Enter Current Password");

        }

        if (!passwordData.newPassword) {

            return alert("Enter New Password");

        }

        if (!passwordData.confirmPassword) {

            return alert("Confirm New Password");

        }

        if (
            passwordData.newPassword !==
            passwordData.confirmPassword
        ) {

            return alert("Password Not Matched");

        }

        try {

            const response = await changePassword(passwordData);

            alert(response.message);

            setPasswordData({

                currentPassword: "",
                newPassword: "",
                confirmPassword: ""

            });

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Password change failed"
            );

        }

    };

    // ================= USE EFFECT =================

    useEffect(() => {

        getProfile();

    }, []);

    // ================= LOADING =================

    if (loading) {

        return (

            <div className="text-center py-20 text-xl font-semibold">

                Loading Profile...

            </div>

        );

    }

    // ================= UI =================

    return (

        <div className="space-y-6">

            {/* ================= HEADER ================= */}

            <div>

                <h1 className="text-3xl font-bold text-gray-800">

                    My Profile

                </h1>

                <p className="text-gray-500">

                    View and update your profile

                </p>

            </div>


            {/* ================= PROFILE CARD ================= */}

            <div className="bg-white rounded-xl shadow p-8">

                {/* PROFILE HEADER */}

                <div className="flex items-center gap-6 border-b pb-6">

                    <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            `${profileData.first_name} ${profileData.last_name}`
                        )}&background=7c3aed&color=fff&size=128`}
                        alt="Profile"
                        className="w-28 h-28 rounded-full border"
                    />

                    <div>

                        <h2 className="text-2xl font-bold">

                            {profileData.first_name}{" "}

                            {profileData.last_name}

                        </h2>

                        <p className="text-gray-500">

                            {profileData.role || "TEAM_LEADER"}

                        </p>

                        <p className="text-gray-500">

                            {profileData.company_name || "-"}

                        </p>

                    </div>

                </div>


                {/* ================= PROFILE DETAILS ================= */}

                <div className="grid grid-cols-2 gap-5 mt-8">

                    {/* FIRST NAME */}

                    <div>

                        <label className="font-semibold block mb-2">

                            First Name

                        </label>

                        <input
                            type="text"
                            name="first_name"
                            value={profileData.first_name || ""}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-4 py-3"
                        />

                    </div>


                    {/* LAST NAME */}

                    <div>

                        <label className="font-semibold block mb-2">

                            Last Name

                        </label>

                        <input
                            type="text"
                            name="last_name"
                            value={profileData.last_name || ""}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-4 py-3"
                        />

                    </div>


                    {/* EMAIL */}

                    <div>

                        <label className="font-semibold block mb-2">

                            Email

                        </label>

                        <input
                            type="email"
                            name="email"
                            value={profileData.email || ""}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-4 py-3"
                        />

                    </div>


                    {/* PHONE */}

                    <div>

                        <label className="font-semibold block mb-2">

                            Phone

                        </label>

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


                    {/* ROLE */}

                    <div>

                        <label className="font-semibold block mb-2">

                            Role

                        </label>

                        <input
                            type="text"
                            value={profileData.role || "TEAM_LEADER"}
                            disabled
                            className="w-full border rounded-lg px-4 py-3 bg-gray-100"
                        />

                    </div>


                    {/* COMPANY */}

                    <div>

                        <label className="font-semibold block mb-2">

                            Company

                        </label>

                        <input
                            type="text"
                            value={profileData.company_name || "-"}
                            disabled
                            className="w-full border rounded-lg px-4 py-3 bg-gray-100"
                        />

                    </div>


                    {/* CREATED DATE */}

                    <div className="col-span-2">

                        <label className="font-semibold block mb-2">

                            Created Date

                        </label>

                        <input
                            type="text"
                            value={
                                profileData.created_at
                                    ? new Date(
                                        profileData.created_at
                                    ).toLocaleDateString()
                                    : "-"
                            }
                            disabled
                            className="w-full border rounded-lg px-4 py-3 bg-gray-100"
                        />

                    </div>

                </div>


                {/* SAVE BUTTON */}

                <div className="flex justify-end mt-8">

                    <button
                        onClick={handleUpdate}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg"
                    >

                        Save Profile

                    </button>

                </div>

            </div>


            {/* ================= CHANGE PASSWORD ================= */}

            <div className="bg-white rounded-xl shadow p-8">

                <h2 className="text-2xl font-bold mb-6">

                    Change Password

                </h2>

                <div className="grid grid-cols-3 gap-5">

                    {/* CURRENT PASSWORD */}

                    <input
                        type="password"
                        name="currentPassword"
                        placeholder="Current Password"
                        value={passwordData.currentPassword}
                        onChange={handlePassword}
                        className="border rounded-lg px-4 py-3"
                    />


                    {/* NEW PASSWORD */}

                    <input
                        type="password"
                        name="newPassword"
                        placeholder="New Password"
                        value={passwordData.newPassword}
                        onChange={handlePassword}
                        className="border rounded-lg px-4 py-3"
                    />


                    {/* CONFIRM PASSWORD */}

                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={passwordData.confirmPassword}
                        onChange={handlePassword}
                        className="border rounded-lg px-4 py-3"
                    />

                </div>


                {/* CHANGE PASSWORD BUTTON */}

                <div className="flex justify-end mt-6">

                    <button
                        onClick={handleChangePassword}
                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg"
                    >

                        Change Password

                    </button>

                </div>

            </div>

        </div>

    );

}

export default TeamLeaderProfile;