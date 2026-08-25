import { useEffect, useState } from "react";

import {
    teamLeadReportList,
    taskReportDetails,
    reviewTaskReport
} from "../../services/taskReportService";


function TeamLeaderReports() {

    // =====================================================
    // COMMON
    // =====================================================

    const [reports, setReports] = useState([]);

    const [loading, setLoading] = useState(false);

    const [selectedReport, setSelectedReport] =
        useState(null);

    const [showModal, setShowModal] =
        useState(false);

    const [reviewRemark, setReviewRemark] =
        useState("");

    const [search, setSearch] =
        useState("");


    // =====================================================
    // LOAD REPORTS
    // =====================================================

    const loadReports = async () => {

        try {

            setLoading(true);

            const response =
                await teamLeadReportList();

            setReports(response.data || []);

        }
        catch (error) {

            console.log(
                "REPORT LIST ERROR:",
                error.response?.data || error
            );

        }
        finally {

            setLoading(false);

        }

    };


    // =====================================================
    // OPEN REPORT
    // =====================================================

    const handleViewReport = async (id) => {

        try {

            const response =
                await taskReportDetails(id);

            setSelectedReport(
                response.data
            );

            setReviewRemark("");

            setShowModal(true);

        }
        catch (error) {

            console.log(
                "REPORT DETAILS ERROR:",
                error.response?.data || error
            );

        }

    };


    // =====================================================
    // REVIEW REPORT
    // =====================================================

    const handleReview = async (action) => {

        try {

            if (
                action === "Rework" &&
                !reviewRemark.trim()
            ) {

                alert(
                    "Rework remark is required"
                );

                return;

            }

            const response =
                await reviewTaskReport(
                    selectedReport.id,
                    {
                        action,
                        review_remarks:
                            reviewRemark
                    }
                );

            alert(
                response.message ||
                "Report Reviewed Successfully"
            );

            setShowModal(false);

            setSelectedReport(null);

            setReviewRemark("");

            await loadReports();

        }
        catch (error) {

            console.log(
                "REPORT REVIEW ERROR:",
                error.response?.data || error
            );

            alert(
                error.response?.data?.message ||
                "Unable to review report"
            );

        }

    };


    // =====================================================
    // SEARCH
    // =====================================================

    const filteredReports =
        reports.filter((report) => {

            const value =
                search.toLowerCase();

            return (

                report.split_task_title
                    ?.toLowerCase()
                    .includes(value) ||

                report.employee_name
                    ?.toLowerCase()
                    .includes(value) ||

                report.parent_task_title
                    ?.toLowerCase()
                    .includes(value)

            );

        });


    // =====================================================
    // LOAD
    // =====================================================

    useEffect(() => {

        loadReports();

    }, []);


    // =====================================================
    // JSX
    // =====================================================

    return (

        <div className="space-y-6">

            {/* HEADER */}

            <div>

                <h1 className="text-3xl font-bold text-gray-800">

                    Task Reports

                </h1>

                <p className="text-gray-500 mt-1">

                    Review Employee and Intern task reports

                </p>

            </div>


            {/* SEARCH */}

            <div className="bg-white rounded-xl shadow p-5">

                <input

                    type="text"

                    placeholder="Search reports..."

                    value={search}

                    onChange={(e) =>
                        setSearch(e.target.value)
                    }

                    className="w-96 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"

                />

            </div>


            {/* TABLE */}

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <table className="w-full">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="px-5 py-4 text-left">
                                Task
                            </th>

                            <th className="px-5 py-4 text-left">
                                Parent Task
                            </th>

                            <th className="px-5 py-4 text-left">
                                Employee
                            </th>

                            <th className="px-5 py-4 text-left">
                                Role
                            </th>

                            <th className="px-5 py-4 text-left">
                                Status
                            </th>

                            <th className="px-5 py-4 text-left">
                                Submitted
                            </th>

                            <th className="px-5 py-4 text-center">
                                Action
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {loading ? (

                            <tr>

                                <td
                                    colSpan="7"
                                    className="text-center py-10"
                                >

                                    Loading Reports...

                                </td>

                            </tr>

                        ) : filteredReports.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="7"
                                    className="text-center py-10 text-gray-500"
                                >

                                    No Reports Found

                                </td>

                            </tr>

                        ) : (

                            filteredReports.map(
                                (report) => (

                                    <tr
                                        key={report.id}
                                        className="border-t hover:bg-gray-50"
                                    >

                                        <td className="px-5 py-4">

                                            <p className="font-semibold">

                                                {
                                                    report.split_task_title
                                                }

                                            </p>

                                            <p className="text-sm text-gray-500">

                                                #{report.split_task_id}

                                            </p>

                                        </td>


                                        <td className="px-5 py-4">

                                            {
                                                report.parent_task_title
                                            }

                                        </td>


                                        <td className="px-5 py-4">

                                            {
                                                report.employee_name
                                            }

                                        </td>


                                        <td className="px-5 py-4">

                                            {
                                                report.employee_role
                                            }

                                        </td>


                                        <td className="px-5 py-4">

                                            <span
                                                className={`px-3 py-1 rounded-full text-sm
                                                ${
                                                    report.review_status ===
                                                    "Approved"

                                                        ? "bg-green-100 text-green-700"

                                                        : report.review_status ===
                                                          "Rework"

                                                        ? "bg-orange-100 text-orange-700"

                                                        : "bg-blue-100 text-blue-700"
                                                }`}
                                            >

                                                {
                                                    report.review_status
                                                }

                                            </span>

                                        </td>


                                        <td className="px-5 py-4">

                                            {
                                                new Date(
                                                    report.submitted_at
                                                ).toLocaleString()
                                            }

                                        </td>


                                        <td className="px-5 py-4 text-center">

                                            <button

                                                onClick={() =>
                                                    handleViewReport(
                                                        report.id
                                                    )
                                                }

                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"

                                            >

                                                View

                                            </button>

                                        </td>

                                    </tr>

                                )
                            )

                        )}

                    </tbody>

                </table>

            </div>


            {/* =================================================
                REPORT DETAILS MODAL
            ================================================= */}

            {showModal &&
                selectedReport && (

                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">

                        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">


                            {/* HEADER */}

                            <div className="border-b px-6 py-5 flex justify-between">

                                <div>

                                    <h2 className="text-2xl font-bold">

                                        Report Details

                                    </h2>

                                    <p className="text-gray-500">

                                        {
                                            selectedReport.employee_name
                                        }

                                    </p>

                                </div>


                                <button

                                    onClick={() =>
                                        setShowModal(false)
                                    }

                                    className="text-2xl text-gray-500 hover:text-red-500"

                                >

                                    ×

                                </button>

                            </div>


                            {/* BODY */}

                            <div className="p-6 space-y-6">


                                {/* TASK INFO */}

                                <div className="bg-gray-50 rounded-xl p-5">

                                    <h3 className="text-xl font-bold">

                                        {
                                            selectedReport.split_task_title
                                        }

                                    </h3>

                                    <p className="text-gray-500 mt-2">

                                        {
                                            selectedReport
                                                .split_task_description ||
                                            "-"
                                        }

                                    </p>


                                    <div className="grid grid-cols-2 gap-5 mt-5">

                                        <div>

                                            <p className="text-sm text-gray-500">

                                                Parent Task

                                            </p>

                                            <p className="font-semibold">

                                                {
                                                    selectedReport
                                                        .parent_task_title
                                                }

                                            </p>

                                        </div>


                                        <div>

                                            <p className="text-sm text-gray-500">

                                                Employee

                                            </p>

                                            <p className="font-semibold">

                                                {
                                                    selectedReport
                                                        .employee_name
                                                }

                                            </p>

                                        </div>

                                    </div>

                                </div>


                                {/* REPORT */}

                                <div>

                                    <h3 className="font-bold text-lg mb-2">

                                        Employee Report

                                    </h3>

                                    <div className="border rounded-xl p-5 bg-white">

                                        {
                                            selectedReport.report
                                        }

                                    </div>

                                </div>


                                {/* REWORK REMARK */}

                                <div>

                                    <label className="font-semibold block mb-2">

                                        Review Remark

                                    </label>

                                    <textarea

                                        value={reviewRemark}

                                        onChange={(e) =>
                                            setReviewRemark(
                                                e.target.value
                                            )
                                        }

                                        rows="4"

                                        placeholder="Enter review remark. Required for Rework."

                                        className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                </div>

                            </div>


                            {/* FOOTER */}

                            <div className="border-t px-6 py-4 flex justify-end gap-3">

                                <button

                                    onClick={() =>
                                        setShowModal(false)
                                    }

                                    className="px-5 py-2 border rounded-lg"

                                >

                                    Close

                                </button>


                                {selectedReport.review_status ===
                                    "Submitted" && (

                                    <>

                                        <button

                                            onClick={() =>
                                                handleReview(
                                                    "Rework"
                                                )
                                            }

                                            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg"

                                        >

                                            Rework

                                        </button>


                                        <button

                                            onClick={() =>
                                                handleReview(
                                                    "Approve"
                                                )
                                            }

                                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"

                                        >

                                            Approve & Complete

                                        </button>

                                    </>

                                )}

                            </div>

                        </div>

                    </div>

                )}

        </div>

    );

}

export default TeamLeaderReports;