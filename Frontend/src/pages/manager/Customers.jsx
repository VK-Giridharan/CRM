import { useEffect, useState } from "react";

import {
    customerList,
    createCustomer,
    customerDetails,
    updateCustomer,
    deleteCustomer
} from "../../services/customerService";

import { PHONE_ERROR_MESSAGE, formatPhoneInput, isPhoneInvalid } from "../../utils/phoneValidation";

function ManagerCustomers() {

    // ============================================
    // Initial Form
    // ============================================

    const initialFormData = {

        customer_id: "",

        customer_name: "",

        company_name: "",

        email: "",

        phone: "",

        alternate_phone: "",

        gst_number: "",

        website: "",

        address: "",

        city: "",

        state: "",

        country: "",

        pincode: "",

        status: true

    };

    // ============================================
    // States
    // ============================================

    const [customers, setCustomers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [showModal, setShowModal] = useState(false);

    const [editMode, setEditMode] = useState(false);

    const [search, setSearch] = useState("");

    const [currentPage, setCurrentPage] = useState(1);

    const recordsPerPage = 10;

    const [formData, setFormData] = useState(initialFormData);

    // ============================================
    // Handle Change
    // ============================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData((prev) => ({

            ...prev,

            [name]:
                name === "status"
                    ? value === "true"
                    : name === "phone" || name === "alternate_phone"
                        ? formatPhoneInput(value)
                        : value

        }));

    };

    // ============================================
    // Get Customer List
    // ============================================

    const getCustomerList = async () => {

        try {

            setLoading(true);

            const response = await customerList();

            setCustomers(response.data);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    // ============================================
    // Load Data
    // ============================================

    useEffect(() => {

        getCustomerList();

    }, []);

    // ============================================
    // Save Customer
    // ============================================

    const handleSave = async () => {

        if (
            !formData.customer_name ||
            !formData.company_name ||
            !formData.phone
        ) {

            alert("Customer Name, Company Name and Phone are required");

            return;

        }

        try {

            setSaving(true);

            if (editMode) {
                await updateCustomer({

                    customer_id: formData.id,

                    ...formData

                });

            } else {

                await createCustomer(formData);

            }

            setShowModal(false);

            setEditMode(false);

            setFormData(initialFormData);

            getCustomerList();

        } catch (error) {

            console.log(error);

        } finally {

            setSaving(false);

        }

    };

    // ============================================
    // Edit Customer
    // ============================================

    const handleEdit = async (id) => {

        try {

            const response = await customerDetails({

                customer_id: id

            });

            setFormData(response.data);

            setEditMode(true);

            setShowModal(true);

        } catch (error) {

            console.log(error);

        }

    };

    // ============================================
    // Delete Customer
    // ============================================

    const handleDelete = async (id) => {

        const confirmDelete = window.confirm(
            "Are you sure you want to delete this customer?"
        );

        if (!confirmDelete) return;

        try {

            await deleteCustomer({

                customer_id: id

            });

            getCustomerList();

        } catch (error) {

            console.log(error);

        }

    };

    // ============================================
    // Search Filter
    // ============================================

    const filteredCustomers = customers.filter((customer) => {

        return (

            customer.customer_name
                ?.toLowerCase()
                .includes(search.toLowerCase())

            ||

            customer.company_name
                ?.toLowerCase()
                .includes(search.toLowerCase())

            ||

            customer.crm_company
                ?.toLowerCase()
                .includes(search.toLowerCase())

            ||

            customer.manager_name
                ?.toLowerCase()
                .includes(search.toLowerCase())

            ||

            customer.phone
                ?.includes(search)

        );

    });

    // ============================================
    // Pagination
    // ============================================

    const lastIndex = currentPage * recordsPerPage;

    const firstIndex = lastIndex - recordsPerPage;

    const currentCustomers = filteredCustomers.slice(
        firstIndex,
        lastIndex
    );

    const totalPages = Math.ceil(
        filteredCustomers.length / recordsPerPage
    );

    // ============================================
    // JSX START
    // ============================================

    return (

        <>

            <div className="space-y-6">

                {/* Header */}

                <div className="flex items-center justify-between">

                    <div>

                        <h1 className="text-3xl font-bold text-gray-800">

                            Customer Management

                        </h1>

                        <p className="text-gray-500">

                            Manage All Customers

                        </p>

                    </div>

                    <button

                        onClick={() => {

                            setEditMode(false);

                            setFormData(initialFormData);

                            setShowModal(true);

                        }}

                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"

                    >

                        + Add Customer

                    </button>

                </div>

                {/* Search */}

                <div className="bg-white rounded-lg shadow p-4">

                    <input

                        type="text"

                        placeholder="Search Customer..."

                        value={search}

                        onChange={(e) => {

                            setSearch(e.target.value);

                            setCurrentPage(1);

                        }}

                        className="w-80 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"

                    />

                </div>

                {/* Customer Table */}

                <div className="bg-white rounded-lg shadow overflow-hidden">

                    <table className="w-full">

                        <thead className="bg-gray-100">

                            <tr>

                                <th className="px-5 py-3 text-left">Customer</th>

                                <th className="px-5 py-3 text-left">Company</th>

                                <th className="px-5 py-3 text-left">CRM Company</th>

                                <th className="px-5 py-3 text-left">Manager</th>

                                <th className="px-5 py-3 text-left">Phone</th>

                                <th className="px-5 py-3 text-left">Status</th>

                                <th className="px-5 py-3 text-center">Action</th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                loading ?

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="text-center py-10">

                                            Loading...

                                        </td>

                                    </tr>

                                    :

                                    currentCustomers.length === 0 ?

                                        <tr>

                                            <td
                                                colSpan="7"
                                                className="text-center py-10">

                                                No Customers Found

                                            </td>

                                        </tr>

                                        :

                                        currentCustomers.map((customer) => (

                                            <tr
                                                key={customer.id}
                                                className="border-t hover:bg-gray-50">

                                                <td className="px-5 py-3">

                                                    {customer.customer_name}

                                                </td>

                                                <td className="px-5 py-3">

                                                    {customer.company_name}

                                                </td>

                                                <td className="px-5 py-3">

                                                    {customer.crm_company}

                                                </td>

                                                <td className="px-5 py-3">

                                                    {customer.manager_name}

                                                </td>

                                                <td className="px-5 py-3">

                                                    {customer.phone}

                                                </td>

                                                <td className="px-5 py-3">

                                                    {

                                                        customer.status ?

                                                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700">

                                                                Active

                                                            </span>

                                                            :

                                                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700">

                                                                Inactive

                                                            </span>

                                                    }

                                                </td>

                                                <td className="px-5 py-3">

                                                    <div className="flex justify-center gap-2">

                                                        <button

                                                            onClick={() => handleEdit(customer.id)}

                                                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded">

                                                            Edit

                                                        </button>

                                                        <button

                                                            onClick={() => handleDelete(customer.id)}

                                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">

                                                            Delete

                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>

                                        ))

                            }

                        </tbody>

                    </table>

                </div>

                {/* Pagination */}

                <div className="flex justify-end gap-2">

                    {

                        [...Array(totalPages)].map((_, index) => (

                            <button

                                key={index}

                                onClick={() => setCurrentPage(index + 1)}

                                className={`px-4 py-2 rounded ${currentPage === index + 1
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200"
                                    }`}

                            >

                                {index + 1}

                            </button>

                        ))

                    }

                </div>

            </div>

            {/* Modal starts here */}

            {

                showModal && (

                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                        <div className="bg-white rounded-xl w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto">

                            <div className="flex justify-between items-center mb-6">

                                <h2 className="text-2xl font-bold">

                                    {

                                        editMode

                                            ? "Edit Customer"

                                            : "Add Customer"

                                    }

                                </h2>

                                <button

                                    onClick={() => {

                                        setShowModal(false);

                                        setEditMode(false);

                                        setFormData(initialFormData);

                                    }}

                                    className="text-3xl">

                                    ×

                                </button>

                            </div>

                            <div className="grid grid-cols-2 gap-4">

                                <input
                                    type="text"
                                    name="customer_name"
                                    placeholder="Customer Name"
                                    value={formData.customer_name}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                />

                                <input
                                    type="text"
                                    name="company_name"
                                    placeholder="Company Name"
                                    value={formData.company_name}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                />

                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                />

                                <div className="flex flex-col">

                                    <input
                                        type="text"
                                        name="phone"
                                        inputMode="numeric"
                                        maxLength={10}
                                        placeholder="Phone Number"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="border rounded-lg px-4 py-3"
                                    />

                                    {isPhoneInvalid(formData.phone) && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {PHONE_ERROR_MESSAGE}
                                        </p>
                                    )}

                                </div>

                                <div className="flex flex-col">

                                    <input
                                        type="text"
                                        name="alternate_phone"
                                        inputMode="numeric"
                                        maxLength={10}
                                        placeholder="Alternate Phone"
                                        value={formData.alternate_phone}
                                        onChange={handleChange}
                                        className="border rounded-lg px-4 py-3"
                                    />

                                    {isPhoneInvalid(formData.alternate_phone) && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {PHONE_ERROR_MESSAGE}
                                        </p>
                                    )}

                                </div>

                                <input
                                    type="text"
                                    name="gst_number"
                                    placeholder="GST Number"
                                    value={formData.gst_number}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                />

                                <input
                                    type="text"
                                    name="website"
                                    placeholder="Website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                />

                                <select
                                    name="status"
                                    value={String(formData.status)}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>

                                <input
                                    type="text"
                                    name="city"
                                    placeholder="City"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                />

                                <input
                                    type="text"
                                    name="state"
                                    placeholder="State"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                />

                                <input
                                    type="text"
                                    name="country"
                                    placeholder="Country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                />

                                <input
                                    type="text"
                                    name="pincode"
                                    placeholder="Pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3"
                                />

                                <textarea
                                    rows={4}
                                    name="address"
                                    placeholder="Address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="border rounded-lg px-4 py-3 col-span-2 resize-none"
                                />

                            </div>

                            <div className="flex justify-end gap-3 mt-6">

                                <button
                                    onClick={() => {

                                        setShowModal(false);

                                        setEditMode(false);

                                        setFormData(initialFormData);

                                    }}
                                    className="border px-5 py-2 rounded-lg"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
                                >
                                    {
                                        saving
                                            ? "Saving..."
                                            : editMode
                                                ? "Update"
                                                : "Save"
                                    }
                                </button>

                            </div>

                        </div>

                    </div>

                )

            }

        </>

    );

}

export default ManagerCustomers;
