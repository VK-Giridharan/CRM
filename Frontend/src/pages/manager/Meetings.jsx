import { useEffect, useState } from "react";

import {
    meetingList,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    completeMeeting
} from "../../services/meetingService";

import { PHONE_ERROR_MESSAGE, formatPhoneInput, isPhoneInvalid } from "../../utils/phoneValidation";

import {
    leadList,
    createLead,
    deleteLead,
    updateLeadStatus,
    updateLead
} from "../../services/leadService";

import { formatDate } from "../../utils/formatDate";

function ManagerMeetings() {

    // ================= COMMON =================

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");

    const [activeTab, setActiveTab] = useState("lead");

    const [currentPage, setCurrentPage] = useState(1);

    const recordsPerPage = 10;

    // ================= LEAD =================

    const [leads, setLeads] = useState([]);

    const [allLeads, setAllLeads] = useState([]);

    // Which slice of the pipeline the Leads tab is showing.
    // "Active" keeps the previous default (Pending + Future Business);
    // "All" and the individual statuses make Converted / Closed /
    // Meeting Scheduled leads reachable again (BUG-018).
    const [leadStatusFilter, setLeadStatusFilter] = useState("Active");

    const [showLeadModal, setShowLeadModal] = useState(false);

    const [leadEditMode, setLeadEditMode] = useState(false);

    const [showLeadDetails, setShowLeadDetails] = useState(false);

    const [leadDeleteModal, setLeadDeleteModal] = useState(false);

    const [selectedLead, setSelectedLead] = useState(null);

    const [leadForm, setLeadForm] = useState({

        lead_name: "",

        company_name: "",

        phone: "",

        email: "",

        requirement: "",

        address: "",

        source: "",

        remarks: ""

    });

    // ================= MEETING =================

    const [meetings, setMeetings] = useState([]);

    const [showModal, setShowModal] = useState(false);

    const [editMode, setEditMode] = useState(false);

    const [selectedMeeting, setSelectedMeeting] = useState(null);

    const [deleteModal, setDeleteModal] = useState(false);

    const [completeModal, setCompleteModal] = useState(false);

    const [meetingForm, setMeetingForm] = useState({

        lead_id: "",

        meeting_title: "",

        meeting_date: "",

        meeting_time: "",

        meeting_type: "Offline",

        location: "",

        description: ""

    });

    const [completeData, setCompleteData] = useState({

        meeting_result: "",

        next_meeting_date: ""

    });


    // ================= GET MEETINGS =================

    const getMeetingList = async () => {

        try {

            setLoading(true);

            const response = await meetingList();

            setMeetings(response.data || []);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    // ================= LEAD INPUT =================

    const handleLeadInput = (e) => {

        const { name, value } = e.target;

        setLeadForm({

            ...leadForm,

            [name]: name === "phone" ? formatPhoneInput(value) : value

        });

    };

    // ================= MEETING INPUT =================

    const handleMeetingInput = (e) => {

        setMeetingForm({

            ...meetingForm,

            [e.target.name]: e.target.value

        });

    };

    // ================= COMPLETE INPUT =================

    const handleCompleteInput = (e) => {

        setCompleteData({

            ...completeData,

            [e.target.name]: e.target.value

        });

    };





    // ================= RESET MEETING =================

    const resetMeetingForm = () => {

        setMeetingForm({

            lead_id: "",

            meeting_title: "",

            meeting_date: "",

            meeting_time: "",

            meeting_type: "Offline",

            location: "",

            description: ""

        });

        setEditMode(false);

        setSelectedMeeting(null);

    };

    // ================= LEAD FUNCTIONS =================

    // ================= GET LEAD LIST =================

    const getLeadList = async () => {

        try {

            setLoading(true);

            const response = await leadList();

            const allData = response.data || [];

            // Store all leads
            setAllLeads(allData);

            // The Leads tab shows whichever slice the status filter selects.
            setLeads(allData);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    // Reset Lead Form

    const resetLeadForm = () => {

        setLeadForm({

            lead_name: "",

            company_name: "",

            phone: "",

            email: "",

            requirement: "",

            address: "",

            source: "",

            remarks: ""

        });

        setLeadEditMode(false);

        setSelectedLead(null);

    };

    // Add / Update Lead

    const handleLeadSave = async () => {

        try {

            if (leadEditMode) {

                await updateLead({

                    lead_id: selectedLead.id,

                    ...leadForm

                });

            } else {

                await createLead(leadForm);

            }

            resetLeadForm();

            setShowLeadModal(false);

            getLeadList();

        } catch (error) {

        console.log("LEAD CREATE/UPDATE ERROR:", error);
        console.log("BACKEND RESPONSE:", error.response?.data);
        console.log("STATUS:", error.response?.status);

        }

    };

    // Edit Lead

    const handleLeadEdit = (lead) => {

        setSelectedLead(lead);

        setLeadForm({

            lead_name: lead.lead_name,

            company_name: lead.company_name,

            phone: lead.phone,

            email: lead.email,

            requirement: lead.requirement,

            address: lead.address,

            source: lead.source,

            remarks: lead.remarks

        });

        setLeadEditMode(true);

        setShowLeadModal(true);

    };

    // View Lead

    const handleLeadView = (lead) => {

        setSelectedLead(lead);

        setShowLeadDetails(true);

    };

    // Delete Popup

    const handleLeadDelete = (lead) => {

        setSelectedLead(lead);

        setLeadDeleteModal(true);

    };

    // Schedule Meeting Directly

    const handleScheduleMeeting = (lead) => {

        resetMeetingForm();

        setMeetingForm({

            lead_id: lead.id,

            meeting_title: "",

            meeting_date: "",

            meeting_time: "",

            meeting_type: "Offline",

            location: "",

            description: ""

        });

        setShowModal(true);

    };

    // ================= EDIT MEETING =================

    const handleEdit = (meeting) => {
        console.log("========== EDIT MEETING ==========");
        console.log("FULL MEETING DATA:", meeting);
        console.log("MEETING LEAD ID:", meeting.lead_id);
        console.log("MEETING LEAD ID TYPE:", typeof meeting.lead_id);
        console.log("ALL LEADS:", allLeads);

        setSelectedMeeting(meeting);

        // Convert meeting date to YYYY-MM-DD
        const formattedDate = meeting.meeting_date
            ? meeting.meeting_date.split("T")[0]
            : "";

        // Convert time to HH:mm
        const formattedTime = meeting.meeting_time
            ? meeting.meeting_time.substring(0, 5)
            : "";

        setMeetingForm({

            lead_id: meeting.lead_id
                ? String(meeting.lead_id)
                : "",

            meeting_title: meeting.meeting_title || "",

            meeting_date: formattedDate,

            meeting_time: formattedTime,

            meeting_type: meeting.meeting_type || "Offline",

            location: meeting.location || "",

            description: meeting.description || ""

        });

        setEditMode(true);

        setShowModal(true);

    };

    // ================= LOAD DATA =================

    useEffect(() => {

        getLeadList();

        getMeetingList();

    }, []);

    // ================= SEARCH =================

    // company_name and email are nullable columns, so each value is coerced
    // to a string before matching.
    const ACTIVE_LEAD_STATUSES = ["Pending", "Future Business"];

    // The backend refuses a meeting for a Converted or Closed lead, so the
    // Schedule Meeting dropdown must not offer them (BUG-019). The lead
    // already attached to the meeting being edited is always kept, otherwise
    // editing an old meeting would blank its own lead.
    const meetingEligibleLeads = allLeads.filter((lead) =>
        lead.status !== "Converted" && lead.status !== "Closed"
            ? true
            : String(lead.id) === String(meetingForm.lead_id)
    );

    const matchesLeadStatus = (lead) => {

        if (leadStatusFilter === "All") return true;

        if (leadStatusFilter === "Active") {
            return ACTIVE_LEAD_STATUSES.includes(lead.status);
        }

        return lead.status === leadStatusFilter;

    };

    const filteredLeads = leads.filter((lead) => {

        if (!matchesLeadStatus(lead)) return false;


        const value = search.toLowerCase();

        return (

            (lead?.lead_name || "").toLowerCase().includes(value) ||

            (lead?.company_name || "").toLowerCase().includes(value) ||

            (lead?.phone || "").toLowerCase().includes(value)

        );

    });

    const filteredMeetings = meetings.filter((meeting) => {

        const value = search.toLowerCase();

        return (

            (meeting?.lead_name || "").toLowerCase().includes(value) ||

            (meeting?.company_name || "").toLowerCase().includes(value) ||

            (meeting?.meeting_title || "").toLowerCase().includes(value)

        );

    });

    // ================= COMMON DATA =================

    const data =
        activeTab === "lead"
            ? filteredLeads
            : filteredMeetings;

    const lastIndex = currentPage * recordsPerPage;

    const firstIndex = lastIndex - recordsPerPage;

    const currentData = data.slice(firstIndex, lastIndex);

    const totalPages = Math.ceil(
        data.length / recordsPerPage
    );

    // ================= PAGINATION =================

    const nextPage = () => {

        if (currentPage < totalPages) {

            setCurrentPage(currentPage + 1);

        }

    };

    const previousPage = () => {

        if (currentPage > 1) {

            setCurrentPage(currentPage - 1);

        }

    };


    // ================= SAVE MEETING =================

    const handleMeetingSave = async () => {

        try {

            if (editMode) {

                await updateMeeting({

                    meeting_id: selectedMeeting.id,

                    ...meetingForm

                });

            } else {

                await createMeeting(meetingForm);

            }

            resetMeetingForm();

            setShowModal(false);

            getMeetingList();

            // Creating or rescheduling a meeting moves the lead's status on
            // the server, so refresh the lead list too (BUG-017).
            getLeadList();

        } catch (error) {

            console.log(error);

        }

    };

    // ================= DELETE MEETING =================

    const confirmDeleteMeeting = async () => {

        try {

            await deleteMeeting({

                meeting_id: selectedMeeting.id

            });

            setDeleteModal(false);

            setSelectedMeeting(null);

            getMeetingList();

            // Deleting the last meeting for a lead resets it to Pending.
            getLeadList();

        } catch (error) {

            console.log(error);

        }

    };

    // ================= COMPLETE MEETING =================

    const confirmCompleteMeeting = async () => {

        try {

            await completeMeeting({

                meeting_id: selectedMeeting.id,

                ...completeData

            });

            setCompleteModal(false);

            setSelectedMeeting(null);

            setCompleteData({

                meeting_result: "",

                next_meeting_date: ""

            });

            getMeetingList();

            getLeadList();

        } catch (error) {

            console.log(error);

        }

    };

    // ================= CONFIRM DELETE =================

    const confirmLeadDelete = async () => {

        try {

            await deleteLead({

                lead_id: selectedLead.id

            });

            setLeadDeleteModal(false);

            setSelectedLead(null);

            getLeadList();

        } catch (error) {

            console.log(error);

        }

    };


    return (
        <div className="space-y-6">

            {/* ================= HEADER ================= */}

            <div className="flex items-center justify-between">

                <div>

                    <h1 className="text-3xl font-bold text-gray-800">

                        Lead & Meeting Management

                    </h1>

                    <p className="text-gray-500 mt-1">

                        Manage Leads, Schedule Meetings and Track Business Progress

                    </p>

                </div>

            </div>

            {/* ================= TABS ================= */}

            <div className="bg-white rounded-xl shadow">

                <div className="flex">

                    <button

                        onClick={() => {

                            setActiveTab("lead");

                            setCurrentPage(1);

                        }}

                        className={`px-6 py-4 font-semibold border-b-2 transition

                ${activeTab === "lead"

                                ? "border-blue-600 text-blue-600"

                                : "border-transparent text-gray-500 hover:text-blue-600"

                            }`}

                    >

                        Leads

                    </button>

                    <button

                        onClick={() => {

                            setActiveTab("meeting");

                            setCurrentPage(1);

                        }}

                        className={`px-6 py-4 font-semibold border-b-2 transition

                ${activeTab === "meeting"

                                ? "border-blue-600 text-blue-600"

                                : "border-transparent text-gray-500 hover:text-blue-600"

                            }`}

                    >

                        Meetings

                    </button>

                </div>

            </div>

            {/* ================= SEARCH & ACTION ================= */}

            <div className="bg-white rounded-xl shadow p-5">

                <div className="flex items-center justify-between">

                    <input

                        type="text"

                        placeholder={

                            activeTab === "lead"

                                ? "Search Lead..."

                                : "Search Meeting..."

                        }

                        value={search}

                        onChange={(e) => {

                            setSearch(e.target.value);

                            setCurrentPage(1);

                        }}

                        className="w-96 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"

                    />

                    {/* Lead status filter (BUG-018): Converted / Closed /
                        Meeting Scheduled leads used to disappear from the UI
                        permanently with no way to get back to them. */}
                    {activeTab === "lead" && (

                        <select

                            value={leadStatusFilter}

                            onChange={(e) => {

                                setLeadStatusFilter(e.target.value);

                                setCurrentPage(1);

                            }}

                            className="border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"

                        >

                            <option value="Active">Active Pipeline</option>

                            <option value="All">All Leads</option>

                            <option value="Pending">Pending</option>

                            <option value="Meeting Scheduled">Meeting Scheduled</option>

                            <option value="Future Business">Future Business</option>

                            <option value="Converted">Converted</option>

                            <option value="Closed">Closed</option>

                        </select>

                    )}

                    <div className="flex items-center gap-5">

                        <div className="text-gray-600">

                            Total

                            <span className="font-semibold ml-2">

                                {

                                    activeTab === "lead"

                                        ? filteredLeads.length

                                        : filteredMeetings.length

                                }

                            </span>

                        </div>

                        {

                            activeTab === "lead"

                                ?

                                <button

                                    onClick={() => {

                                        resetLeadForm();

                                        setShowLeadModal(true);

                                    }}

                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg"

                                >

                                    + Add Lead

                                </button>

                                :

                                <button

                                    onClick={() => {

                                        resetMeetingForm();

                                        setShowModal(true);

                                    }}

                                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg"

                                >

                                    + Schedule Meeting

                                </button>

                        }

                    </div>

                </div>

            </div>

            {
                activeTab === "lead" && (

                    <div className="bg-white rounded-lg shadow overflow-hidden">

                        <table className="w-full">

                            <thead className="bg-gray-100">

                                <tr>

                                    <th className="px-5 py-3 text-left">
                                        Lead Name
                                    </th>

                                    <th className="px-5 py-3 text-left">
                                        Company
                                    </th>

                                    <th className="px-5 py-3 text-left">
                                        Phone
                                    </th>

                                    <th className="px-5 py-3 text-left">
                                        Requirement
                                    </th>

                                    <th className="px-5 py-3 text-left">
                                        Status
                                    </th>

                                    <th className="px-5 py-3 text-center">
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {

                                    loading ?

                                        <tr>

                                            <td
                                                colSpan="6"
                                                className="text-center py-10"
                                            >

                                                Loading...

                                            </td>

                                        </tr>

                                        :

                                        currentData.length === 0 ?

                                            <tr>

                                                <td
                                                    colSpan="6"
                                                    className="text-center py-10"
                                                >

                                                    No Leads Found

                                                </td>

                                            </tr>

                                            :

                                            currentData.map((lead) => (

                                                <tr
                                                    key={lead.id}
                                                    className="border-t hover:bg-gray-50"
                                                >

                                                    <td className="px-5 py-3">

                                                        {lead.lead_name}

                                                    </td>

                                                    <td className="px-5 py-3">

                                                        {lead.company_name}

                                                    </td>

                                                    <td className="px-5 py-3">

                                                        {lead.phone}

                                                    </td>

                                                    <td className="px-5 py-3">

                                                        {lead.requirement}

                                                    </td>

                                                    <td className="px-5 py-3">

                                                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">

                                                            {lead.status}

                                                        </span>

                                                    </td>

                                                    <td className="px-5 py-3">

                                                        <div className="flex justify-center gap-2">

                                                            <button
                                                                onClick={() => handleLeadView(lead)}
                                                                className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded"
                                                            >

                                                                View

                                                            </button>

                                                            <button
                                                                onClick={() => handleLeadEdit(lead)}
                                                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                                                            >

                                                                Edit

                                                            </button>

                                                            <button
                                                                onClick={() => handleScheduleMeeting(lead)}
                                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                                                            >

                                                                Meeting

                                                            </button>

                                                            <button
                                                                onClick={() => handleLeadDelete(lead)}
                                                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                                                            >

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

                )
            }
            {
                activeTab === "meeting" &&

                <div className="bg-white rounded-lg shadow overflow-hidden">

                    <table className="w-full">

                        <thead className="bg-gray-100">

                            <tr>

                                <th className="px-5 py-3 text-left">
                                    Lead
                                </th>

                                <th className="px-5 py-3 text-left">
                                    Company
                                </th>

                                <th className="px-5 py-3 text-left">
                                    Meeting
                                </th>

                                <th className="px-5 py-3 text-left">
                                    Date
                                </th>

                                <th className="px-5 py-3 text-left">
                                    Time
                                </th>

                                <th className="px-5 py-3 text-left">
                                    Type
                                </th>

                                <th className="px-5 py-3 text-left">
                                    Status
                                </th>

                                <th className="px-5 py-3 text-center">
                                    Action
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                loading ?

                                    <tr>

                                        <td
                                            colSpan="8"
                                            className="text-center py-10"
                                        >

                                            Loading...

                                        </td>

                                    </tr>

                                    :

                                    currentData.length === 0 ?

                                        <tr>

                                            <td
                                                colSpan="8"
                                                className="text-center py-10"
                                            >

                                                No Meetings Found

                                            </td>

                                        </tr>

                                        :

                                        currentData.map((meeting) => (

                                            <tr
                                                key={meeting.id}
                                                className="border-t hover:bg-gray-50"
                                            >

                                                <td className="px-5 py-3">
                                                    {meeting.lead_name || ""}
                                                </td>

                                                <td className="px-5 py-3">
                                                    {meeting.company_name || ""}
                                                </td>

                                                <td className="px-5 py-3">
                                                    {meeting.meeting_title || ""}
                                                </td>

                                                <td className="px-5 py-3">
                                                    {formatDate(meeting.meeting_date)}
                                                </td>

                                                <td className="px-5 py-3">
                                                    {meeting.meeting_time}
                                                </td>

                                                <td className="px-5 py-3">
                                                    {meeting.meeting_type}
                                                </td>

                                                <td className="px-5 py-3">

                                                    {

                                                        meeting.status === "Scheduled" ?

                                                            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">

                                                                Scheduled

                                                            </span>

                                                            :

                                                            meeting.status === "Completed" ?

                                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">

                                                                    Completed

                                                                </span>

                                                                :

                                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">

                                                                    Cancelled

                                                                </span>

                                                    }

                                                </td>

                                                <td className="px-5 py-3 text-center space-x-2">

                                                    {

                                                        meeting.status !== "Completed" &&

                                                        <button

                                                            onClick={() => handleEdit(meeting)}

                                                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"

                                                        >

                                                            Edit

                                                        </button>

                                                    }

                                                    {

                                                        meeting.status !== "Completed" &&

                                                        <button

                                                            onClick={() => {

                                                                setSelectedMeeting(meeting);

                                                                setCompleteModal(true);

                                                            }}

                                                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"

                                                        >

                                                            Complete

                                                        </button>

                                                    }

                                                    {

                                                        meeting.status !== "Completed" &&

                                                        <button

                                                            onClick={() => {

                                                                setSelectedMeeting(meeting);

                                                                setDeleteModal(true);

                                                            }}

                                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"

                                                        >

                                                            Delete

                                                        </button>

                                                    }

                                                </td>

                                            </tr>

                                        ))

                            }

                        </tbody>

                    </table>

                </div>

            }
            {/* ================= PAGINATION ================= */}

            <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">

                <div className="text-gray-600">
                    Showing
                    <span className="font-semibold mx-2">
                        {currentData.length === 0 ? 0 : firstIndex + 1}
                    </span>
                    -
                    <span className="font-semibold mx-2">
                        {Math.min(lastIndex, data.length)}
                    </span>
                    of
                    <span className="font-semibold mx-2">
                        {data.length}
                    </span>
                    Records
                </div>

                <div className="flex items-center gap-3">

                    <button
                        onClick={previousPage}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-lg border ${currentPage === 1
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white hover:bg-gray-100"
                            }`}
                    >
                        Previous
                    </button>

                    <span className="font-semibold">
                        Page {currentPage} of {totalPages || 1}
                    </span>

                    <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className={`px-4 py-2 rounded-lg border ${currentPage === totalPages || totalPages === 0
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white hover:bg-gray-100"
                            }`}
                    >
                        Next
                    </button>

                </div>

            </div>

            {/* ================= LEAD MODAL ================= */}

            {
                showLeadModal &&

                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl">

                        {/* Header */}

                        <div className="flex items-center justify-between border-b px-6 py-4">

                            <h2 className="text-xl font-semibold">

                                {leadEditMode ? "Update Lead" : "Add New Lead"}

                            </h2>

                            <button

                                onClick={() => {

                                    setShowLeadModal(false);
                                    resetLeadForm();

                                }}

                                className="text-2xl text-gray-500 hover:text-red-500"

                            >

                                ×

                            </button>

                        </div>

                        {/* Body */}

                        <div className="grid grid-cols-2 gap-5 p-6">

                            <div>

                                <label className="block text-sm font-medium mb-1">

                                    Lead Name

                                </label>

                                <input

                                    type="text"

                                    name="lead_name"

                                    value={leadForm.lead_name}

                                    onChange={handleLeadInput}

                                    className="w-full border rounded-lg px-4 py-2"

                                />

                            </div>

                            <div>

                                <label className="block text-sm font-medium mb-1">

                                    Company

                                </label>

                                <input

                                    type="text"

                                    name="company_name"

                                    value={leadForm.company_name}

                                    onChange={handleLeadInput}

                                    className="w-full border rounded-lg px-4 py-2"

                                />

                            </div>

                            <div>

                                <label className="block text-sm font-medium mb-1">

                                    Phone

                                </label>

                                <input

                                    type="text"

                                    name="phone"

                                    inputMode="numeric"

                                    maxLength={10}

                                    value={leadForm.phone}

                                    onChange={handleLeadInput}

                                    className="w-full border rounded-lg px-4 py-2"

                                />

                                {isPhoneInvalid(leadForm.phone) && (

                                    <p className="text-red-500 text-sm mt-1">

                                        {PHONE_ERROR_MESSAGE}

                                    </p>

                                )}

                            </div>

                            <div>

                                <label className="block text-sm font-medium mb-1">

                                    Email

                                </label>

                                <input

                                    type="email"

                                    name="email"

                                    value={leadForm.email}

                                    onChange={handleLeadInput}

                                    className="w-full border rounded-lg px-4 py-2"

                                />

                            </div>

                            <div>

                                <label className="block text-sm font-medium mb-1">

                                    Requirement

                                </label>

                                <input

                                    type="text"

                                    name="requirement"

                                    value={leadForm.requirement}

                                    onChange={handleLeadInput}

                                    className="w-full border rounded-lg px-4 py-2"

                                />

                            </div>

                            <div>

                                <label className="block text-sm font-medium mb-1">

                                    Source

                                </label>

                                <input

                                    type="text"

                                    name="source"

                                    value={leadForm.source}

                                    onChange={handleLeadInput}

                                    className="w-full border rounded-lg px-4 py-2"

                                />

                            </div>

                            <div className="col-span-2">

                                <label className="block text-sm font-medium mb-1">

                                    Address

                                </label>

                                <textarea

                                    rows="2"

                                    name="address"

                                    value={leadForm.address}

                                    onChange={handleLeadInput}

                                    className="w-full border rounded-lg px-4 py-2"

                                />

                            </div>

                            <div className="col-span-2">

                                <label className="block text-sm font-medium mb-1">

                                    Remarks

                                </label>

                                <textarea

                                    rows="3"

                                    name="remarks"

                                    value={leadForm.remarks}

                                    onChange={handleLeadInput}

                                    className="w-full border rounded-lg px-4 py-2"

                                />

                            </div>

                        </div>

                        {/* Footer */}

                        <div className="flex justify-end gap-3 border-t px-6 py-4">

                            <button

                                onClick={() => {

                                    setShowLeadModal(false);
                                    resetLeadForm();

                                }}

                                className="px-5 py-2 rounded-lg border"

                            >

                                Cancel

                            </button>

                            <button

                                onClick={handleLeadSave}

                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"

                            >

                                {leadEditMode ? "Update Lead" : "Save Lead"}

                            </button>

                        </div>

                    </div>

                </div>

            }

            {/* ================= LEAD DETAILS MODAL ================= */}

            {
                showLeadDetails && selectedLead && (

                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">

                            <div className="flex items-center justify-between border-b px-6 py-4">

                                <h2 className="text-xl font-bold">
                                    Lead Details
                                </h2>

                                <button
                                    onClick={() => setShowLeadDetails(false)}
                                    className="text-gray-500 hover:text-red-500 text-2xl"
                                >
                                    ×
                                </button>

                            </div>

                            <div className="p-6 grid grid-cols-2 gap-5">

                                <div>
                                    <p className="text-sm text-gray-500">
                                        Lead Name
                                    </p>

                                    <p className="font-semibold">
                                        {selectedLead.lead_name}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">
                                        Company
                                    </p>

                                    <p className="font-semibold">
                                        {selectedLead.company_name}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">
                                        Phone
                                    </p>

                                    <p className="font-semibold">
                                        {selectedLead.phone}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">
                                        Email
                                    </p>

                                    <p className="font-semibold">
                                        {selectedLead.email}
                                    </p>
                                </div>

                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500">
                                        Requirement
                                    </p>

                                    <p className="font-semibold">
                                        {selectedLead.requirement}
                                    </p>
                                </div>

                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500">
                                        Address
                                    </p>

                                    <p className="font-semibold">
                                        {selectedLead.address}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">
                                        Source
                                    </p>

                                    <p className="font-semibold">
                                        {selectedLead.source}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">
                                        Status
                                    </p>

                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                                        {selectedLead.status}
                                    </span>
                                </div>

                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500">
                                        Remarks
                                    </p>

                                    <p className="font-semibold whitespace-pre-wrap">
                                        {selectedLead.remarks || "-"}
                                    </p>
                                </div>

                            </div>

                            <div className="border-t p-5 flex justify-end">

                                <button
                                    onClick={() => setShowLeadDetails(false)}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-lg"
                                >
                                    Close
                                </button>

                            </div>

                        </div>

                    </div>

                )
            }


            {/* ================= LEAD DELETE MODAL ================= */}

            {
                leadDeleteModal &&

                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

                    <div className="bg-white rounded-xl w-[420px] p-6">

                        <h2 className="text-2xl font-bold text-red-600 mb-4">

                            Delete Lead

                        </h2>

                        <p className="text-gray-600">

                            Are you sure you want to delete

                            <span className="font-semibold">

                                {" "}{selectedLead?.lead_name}

                            </span>

                            ?

                        </p>

                        <p className="text-sm text-red-500 mt-2">

                            This action cannot be undone.

                        </p>

                        <div className="flex justify-end gap-3 mt-8">

                            <button

                                onClick={() => {

                                    setLeadDeleteModal(false);

                                    setSelectedLead(null);

                                }}

                                className="px-5 py-2 rounded-lg border"

                            >

                                Cancel

                            </button>

                            <button

                                onClick={confirmLeadDelete}

                                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"

                            >

                                Delete

                            </button>

                        </div>

                    </div>

                </div>

            }

            {/* ================= MEETING MODAL ================= */}

            {
                showModal &&

                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white w-[650px] rounded-xl shadow-xl">

                        <div className="border-b px-6 py-4 flex justify-between items-center">

                            <h2 className="text-xl font-semibold">

                                {editMode ? "Update Meeting" : "Schedule Meeting"}

                            </h2>

                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    resetMeetingForm();
                                }}
                                className="text-gray-500 hover:text-red-500 text-2xl"
                            >
                                ×
                            </button>

                        </div>

                        <div className="p-6 grid grid-cols-2 gap-4">

                            <div>

                                <label className="text-sm font-medium">
                                    Lead
                                </label>

                                <select
                                    name="lead_id"
                                    value={meetingForm.lead_id}
                                    onChange={handleMeetingInput}
                                    className="w-full border rounded-lg px-3 py-2 mt-1"
                                >

                                    <option value="">Select Lead</option>

                                    {
                                        meetingEligibleLeads.map((lead) => (

                                            <option
                                                key={lead.id}
                                                value={String(lead.id)}
                                            >
                                                {lead.lead_name}
                                            </option>

                                        ))
                                    }

                                </select>

                            </div>

                            <div>

                                <label className="text-sm font-medium">
                                    Meeting Title
                                </label>

                                <input
                                    type="text"
                                    name="meeting_title"
                                    value={meetingForm.meeting_title}
                                    onChange={handleMeetingInput}
                                    className="w-full border rounded-lg px-3 py-2 mt-1"
                                />

                            </div>

                            <div>

                                <label className="text-sm font-medium">
                                    Meeting Date
                                </label>

                                <input
                                    type="date"
                                    name="meeting_date"
                                    value={meetingForm.meeting_date}
                                    onChange={handleMeetingInput}
                                    className="w-full border rounded-lg px-3 py-2 mt-1"
                                />

                            </div>

                            <div>

                                <label className="text-sm font-medium">
                                    Meeting Time
                                </label>

                                <input
                                    type="time"
                                    name="meeting_time"
                                    value={meetingForm.meeting_time}
                                    onChange={handleMeetingInput}
                                    className="w-full border rounded-lg px-3 py-2 mt-1"
                                />

                            </div>

                            <div>

                                <label className="text-sm font-medium">
                                    Meeting Type
                                </label>

                                <select
                                    name="meeting_type"
                                    value={meetingForm.meeting_type}
                                    onChange={handleMeetingInput}
                                    className="w-full border rounded-lg px-3 py-2 mt-1"
                                >

                                    <option>Offline</option>

                                    <option>Online</option>

                                </select>

                            </div>

                            <div>

                                <label className="text-sm font-medium">
                                    Location
                                </label>

                                <input
                                    type="text"
                                    name="location"
                                    value={meetingForm.location}
                                    onChange={handleMeetingInput}
                                    className="w-full border rounded-lg px-3 py-2 mt-1"
                                />

                            </div>

                            <div className="col-span-2">

                                <label className="text-sm font-medium">
                                    Description
                                </label>

                                <textarea
                                    rows={4}
                                    name="description"
                                    value={meetingForm.description}
                                    onChange={handleMeetingInput}
                                    className="w-full border rounded-lg px-3 py-2 mt-1 resize-none"
                                />

                            </div>

                        </div>

                        <div className="border-t px-6 py-4 flex justify-end gap-3">

                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    resetMeetingForm();
                                }}
                                className="px-5 py-2 border rounded-lg"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleMeetingSave}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                            >
                                {editMode ? "Update" : "Save"}
                            </button>

                        </div>

                    </div>

                </div>

            }

            {/* ================= MEETING COMPLETE MODAL ================= */}

            {
                completeModal &&

                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white rounded-xl shadow-lg w-[500px]">

                        <div className="border-b px-6 py-4">

                            <h2 className="text-xl font-bold">

                                Complete Meeting

                            </h2>

                        </div>

                        <div className="p-6 space-y-5">

                            <div>

                                <label className="block mb-2 font-medium">

                                    Meeting Result

                                </label>

                                <textarea

                                    name="meeting_result"

                                    rows="4"

                                    value={completeData.meeting_result}

                                    onChange={handleCompleteInput}

                                    className="w-full border rounded-lg px-4 py-3"

                                    placeholder="Enter meeting discussion..."

                                />

                            </div>

                            <div>

                                <label className="block mb-2 font-medium">

                                    Next Meeting Date (Optional)

                                </label>

                                <input

                                    type="date"

                                    name="next_meeting_date"

                                    value={completeData.next_meeting_date}

                                    onChange={handleCompleteInput}

                                    className="w-full border rounded-lg px-4 py-3"

                                />

                            </div>

                        </div>

                        <div className="border-t px-6 py-4 flex justify-end gap-3">

                            <button

                                onClick={() => {

                                    setCompleteModal(false);

                                    setCompleteData({

                                        meeting_result: "",

                                        next_meeting_date: ""

                                    });

                                }}

                                className="px-5 py-2 border rounded-lg"

                            >

                                Cancel

                            </button>

                            <button

                                onClick={confirmCompleteMeeting}

                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"

                            >

                                Complete Meeting

                            </button>

                        </div>

                    </div>

                </div>

            }

            {/* ================= MEETING DELETE MODAL ================= */}

            {
                deleteModal &&

                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white rounded-xl shadow-xl w-[420px] p-6">

                        <h2 className="text-xl font-bold text-red-600">

                            Delete Meeting

                        </h2>

                        <p className="text-gray-600 mt-4">

                            Are you sure you want to delete this meeting?

                        </p>

                        {
                            selectedMeeting &&

                            <div className="mt-5 bg-gray-50 rounded-lg p-4">

                                <p>

                                    <span className="font-semibold">
                                        Lead :
                                    </span>{" "}
                                    {selectedMeeting.lead_name}

                                </p>

                                <p>

                                    <span className="font-semibold">
                                        Company :
                                    </span>{" "}
                                    {selectedMeeting.company_name}

                                </p>

                                <p>

                                    <span className="font-semibold">
                                        Meeting :
                                    </span>{" "}
                                    {selectedMeeting.meeting_title}

                                </p>

                            </div>

                        }

                        <div className="flex justify-end gap-3 mt-6">

                            <button

                                onClick={() => {

                                    setDeleteModal(false);

                                    setSelectedMeeting(null);

                                }}

                                className="px-5 py-2 rounded-lg border"

                            >

                                Cancel

                            </button>

                            <button

                                onClick={confirmDeleteMeeting}

                                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"

                            >

                                Delete

                            </button>

                        </div>

                    </div>

                </div>

            }




        </div>
    )
}

export default ManagerMeetings;
