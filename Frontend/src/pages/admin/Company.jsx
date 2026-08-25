import { useEffect, useState } from "react";
import { createCompany, companyList, companyDetails, updateCompany, deleteCompany } from "../../services/companyService";
import { PHONE_ERROR_MESSAGE, formatPhoneInput, isPhoneInvalid } from "../../utils/phoneValidation";

function AdminCompanyList() {

    // ================= STATES =================

    const [showModal, setShowModal] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [companyId, setCompanyId] = useState(null);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const recordsPerPage = 10;

    const [formData, setFormData] = useState({
        company_name: "",
        company_code: "",
        email: "",
        phone: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
        logo: "",
        address: "",
        status: true
    });

    const resetForm = () => {
        setFormData({
            company_name: "",
            company_code: "",
            email: "",
            phone: "",
            city: "",
            state: "",
            country: "",
            pincode: "",
            logo: "",
            address: "",
            status: true
        });
    };

    // ================= FUNCTIONS =================

    const getCompanyList = async () => {
        try {
            setLoading(true);

            const response = await companyList();

            setCompanies(response.data);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }
    };

    const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData({
        ...formData,
        [name]:
            name === "status"
                ? value === "true"
                : name === "phone"
                    ? formatPhoneInput(value)
                    : value
    });

};


    const handleSave = async () => {

        try {

            setSaving(true);

            let response;

            if (isEdit) {

                response = await updateCompany({
                    id: companyId,
                    ...formData
                });

            } else {

                response = await createCompany(formData);

            }

            alert(response.message);

            resetForm();

            setCompanyId(null);

            setIsEdit(false);

            setShowModal(false);

            getCompanyList();

        } catch (error) {

            alert(error.response?.data?.message || "Something Went Wrong");

        } finally {

            setSaving(false);

        }

    };

    const handleEdit = async (id) => {

        try {

            const response = await companyDetails(id);

            const company = response.data;

            setCompanyId(company.id);

            setFormData({
                company_name: company.company_name,
                company_code: company.company_code,
                email: company.email,
                phone: company.phone,
                city: company.city,
                state: company.state,
                country: company.country,
                pincode: company.pincode,
                logo: company.logo,
                address: company.address,
                status: company.status
            });

            setIsEdit(true);

            setShowModal(true);

        } catch (error) {

            console.log(error);

        }

    };

    const handleDelete = async (id) => {

        const confirmDelete = window.confirm("Are you sure you want to delete this company?");

        if (!confirmDelete) return;

        try {

            const response = await deleteCompany(id);

            alert(response.message);

            getCompanyList();

        } catch (error) {

            alert(error.response?.data?.message || "Something Went Wrong");

        }

    };

    // ================= USE EFFECT =================

    // companies.email is nullable - an unguarded .toLowerCase() here crashed
    // the page as soon as one company had no email on file.
    const filteredCompanies = companies.filter((company) => {

        const value = search.toLowerCase();

        return (
            (company?.company_name || "").toLowerCase().includes(value) ||
            (company?.company_code || "").toLowerCase().includes(value) ||
            (company?.email || "").toLowerCase().includes(value)
        );

    });

    // Pagination

    const lastIndex = currentPage * recordsPerPage;

    const firstIndex = lastIndex - recordsPerPage;

    const currentCompanies = filteredCompanies.slice(firstIndex, lastIndex);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredCompanies.length / recordsPerPage)
    );

    useEffect(() => {
        getCompanyList();
    }, []);

    // ================= JSX =================

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">

                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Company Management</h1>
                    <p className="text-gray-500">Manage all companies</p>
                </div>

                <button
                    onClick={() => {

                        resetForm();

                        setCompanyId(null);

                        setIsEdit(false);

                        setShowModal(true);

                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg">

                    + Add Company

                </button>

            </div>

            <div className="bg-white rounded-lg shadow p-4">

                <input
                    type="text"
                    placeholder="Search Company..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-80 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />

            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">

                <table className="w-full">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="text-left px-5 py-3">Company</th>
                            <th className="text-left px-5 py-3">Code</th>
                            <th className="text-left px-5 py-3">Email</th>
                            <th className="text-left px-5 py-3">Phone</th>
                            <th className="text-left px-5 py-3">Status</th>
                            <th className="text-center px-5 py-3">Action</th>

                        </tr>

                    </thead>

                    <tbody>

                        {
                            loading ?

                                <tr>
                                    <td colSpan="6" className="text-center py-10">
                                        Loading...
                                    </td>
                                </tr>

                                :

                                filteredCompanies.length === 0 ?

                                    <tr>
                                        <td colSpan="6" className="text-center py-10">
                                            No Company Found
                                        </td>
                                    </tr>

                                    :

                                    currentCompanies.map((company) => (

                                        <tr key={company.id} className="border-t">

                                            <td className="px-5 py-3">{company.company_name}</td>

                                            <td className="px-5 py-3">{company.company_code}</td>

                                            <td className="px-5 py-3">{company.email}</td>

                                            <td className="px-5 py-3">{company.phone}</td>

                                            <td className="px-5 py-3">

                                                {
                                                    company.status ?

                                                        <span className="text-green-600 font-semibold">
                                                            Active
                                                        </span>

                                                        :

                                                        <span className="text-red-600 font-semibold">
                                                            Inactive
                                                        </span>
                                                }

                                            </td>

                                            <td className="px-5 py-3 text-center">

                                                <button
                                                    onClick={() => handleEdit(company.id)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded mr-2">
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(company.id)}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                                                    Delete
                                                </button>

                                            </td>

                                        </tr>

                                    ))
                        }

                    </tbody>

                </table>

                <div className="flex justify-between items-center mt-5">

                    <p>
                        Total : {filteredCompanies.length}
                    </p>

                    <div className="flex gap-2">

                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="px-4 py-2 border rounded disabled:opacity-50">
                            Previous
                        </button>

                        <span className="px-4 py-2">
                            {currentPage} / {totalPages}
                        </span>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="px-4 py-2 border rounded disabled:opacity-50">
                            Next
                        </button>

                    </div>

                </div>

            </div>

            {
                showModal &&

                <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

                    <div className="bg-white rounded-xl w-full max-w-3xl p-6">

                        <div className="flex justify-between items-center mb-6">

                            <h2 className="text-2xl font-bold">
                                {isEdit ? "Edit Company" : "Add Company"}
                            </h2>

                            <button
                                onClick={() => setShowModal(false)}
                                className="text-2xl">
                                ×
                            </button>

                        </div>

                        <div className="grid grid-cols-2 gap-4">

                            <input
                                type="text"
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleChange}
                                placeholder="Company Name"
                                className="border rounded-lg px-4 py-3"
                            />
                            <input
                                type="text"
                                name="company_code"
                                value={formData.company_code}
                                onChange={handleChange}
                                placeholder="Company Code"
                                className="border rounded-lg px-4 py-3"
                            />

                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Email"
                                className="border rounded-lg px-4 py-3"
                            />
                            <div className="flex flex-col">

                                <input
                                    type="text"
                                    name="phone"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Phone"
                                    className="border rounded-lg px-4 py-3"
                                />

                                {isPhoneInvalid(formData.phone) && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {PHONE_ERROR_MESSAGE}
                                    </p>
                                )}

                            </div>

                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="City"
                                className="border rounded-lg px-4 py-3"
                            />
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                placeholder="State"
                                className="border rounded-lg px-4 py-3"
                            />

                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                placeholder="Country"
                                className="border rounded-lg px-4 py-3"
                            />

                            <input
                                type="text"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                                placeholder="Pincode"
                                className="border rounded-lg px-4 py-3"
                            />
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="border rounded-lg px-4 py-3"
                            >
                                <option value={true}>Active</option>
                                <option value={false}>Inactive</option>
                            </select>
                            <input
                                type="text"
                                name="logo"
                                value={formData.logo}
                                onChange={handleChange}
                                placeholder="Logo URL"
                                className="border rounded-lg px-4 py-3 col-span-2"
                            />
                            <textarea
                                rows="3"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Address"
                                className="border rounded-lg px-4 py-3 col-span-2 resize-none"
                            />

                        </div>

                        <div className="flex justify-end gap-3 mt-6">

                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2 rounded-lg border">
                                Cancel
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400">
                                {
                                    saving
                                        ? "Saving..."
                                        : isEdit
                                            ? "Update Company"
                                            : "Save Company"
                                }
                            </button>

                        </div>

                    </div>

                </div>

            }

        </div>
    );
}

export default AdminCompanyList;