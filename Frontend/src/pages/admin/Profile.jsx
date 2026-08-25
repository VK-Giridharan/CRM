import { useEffect, useState } from "react";
import { profile, updateProfile, changePassword } from "../../services/profileService";
import { PHONE_ERROR_MESSAGE, formatPhoneInput, isPhoneInvalid } from "../../utils/phoneValidation";

function AdminProfile() {

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

            setProfileData(response.data);

        } catch (error) {

            console.log(error);

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

            alert(error.response?.data?.message);

        }

    };

    // ================= CHANGE PASSWORD =================

    const handleChangePassword = async () => {

        if (passwordData.newPassword !== passwordData.confirmPassword) {

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

            alert(error.response?.data?.message);

        }

    };

    // ================= USE EFFECT =================

    useEffect(() => {

        getProfile();

    }, []);

    if (loading) {

        return (

            <div className="text-center py-20 text-xl font-semibold">

                Loading Profile...

            </div>

        );

    }

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

    <div className="bg-white rounded-xl shadow p-8">

        <div className="flex items-center gap-6 border-b pb-6">

            <img
                src="https://ui-avatars.com/api/?name=Admin&background=2563eb&color=fff&size=128"
                alt="Profile"
                className="w-28 h-28 rounded-full border"
            />

            <div>

                <h2 className="text-2xl font-bold">

                    {profileData.first_name} {profileData.last_name}

                </h2>

                <p className="text-gray-500">

                    {profileData.role}

                </p>

                <p className="text-gray-500">

                    {profileData.company_name || "-"}

                </p>

            </div>

        </div>

        <div className="grid grid-cols-2 gap-5 mt-8">

            <div>

                <label className="font-semibold block mb-2">

                    First Name

                </label>

                <input
                    type="text"
                    name="first_name"
                    value={profileData.first_name}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-3"
                />

            </div>

            <div>

                <label className="font-semibold block mb-2">

                    Last Name

                </label>

                <input
                    type="text"
                    name="last_name"
                    value={profileData.last_name}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-3"
                />

            </div>

            <div>

                <label className="font-semibold block mb-2">

                    Email

                </label>

                <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-3"
                />

            </div>

            <div>

                <label className="font-semibold block mb-2">

                    Phone

                </label>

                <input
                    type="text"
                    name="phone"
                    inputMode="numeric"
                    maxLength={10}
                    value={profileData.phone}
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

                <label className="font-semibold block mb-2">

                    Role

                </label>

                <input
                    type="text"
                    value={profileData.role}
                    disabled
                    className="w-full border rounded-lg px-4 py-3 bg-gray-100"
                />

            </div>

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

            <div className="col-span-2">

                <label className="font-semibold block mb-2">

                    Created Date

                </label>

                <input
                    type="text"
                    value={new Date(profileData.created_at).toLocaleDateString()}
                    disabled
                    className="w-full border rounded-lg px-4 py-3 bg-gray-100"
                />

            </div>

        </div>

        <div className="flex justify-end mt-8">

            <button
                onClick={handleUpdate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg">

                Save Profile

            </button>

        </div>

    </div>

    <div className="bg-white rounded-xl shadow p-8">

        <h2 className="text-2xl font-bold mb-6">

            Change Password

        </h2>

        <div className="grid grid-cols-3 gap-5">

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
                placeholder="New Password"
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
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg">

                Change Password

            </button>

        </div>

    </div>

</div>
);

}

export default AdminProfile;
