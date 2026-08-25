import api from "./api";


// =====================================================
// EMPLOYEE / INTERN
// =====================================================

// Accepts { split_task_id, report, attachment? }.
// When an attachment is present the payload is sent as multipart/form-data,
// otherwise as plain JSON.
export const submitTaskReport = async ({
    split_task_id,
    report,
    attachment
}) => {

    if (attachment) {

        const formData = new FormData();

        formData.append("split_task_id", split_task_id);
        formData.append("report", report);
        formData.append("attachment", attachment);

        const response = await api.post(
            "/task-report/submit",
            formData
        );

        return response.data;

    }

    const response = await api.post(
        "/task-report/submit",
        {
            split_task_id,
            report
        }
    );

    return response.data;
};


// Downloads are authorised server-side, so the blob is fetched through the
// axios instance (which carries the bearer token) rather than a plain link.
export const downloadReportAttachment = async (reportId, fileName) => {

    const response = await api.get(
        `/task-report/${reportId}/attachment`,
        { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName || `report-${reportId}`);

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
};


// =====================================================
// TEAM LEAD REPORT LIST
// =====================================================

export const teamLeadReportList = async () => {

    const response = await api.get(
        "/task-report/team-lead"
    );

    return response.data;
};


// =====================================================
// MY REPORTS
// =====================================================

export const myTaskReports = async () => {

    const response = await api.get(
        "/task-report/my"
    );

    return response.data;
};


// =====================================================
// REPORT DETAILS
// =====================================================

export const taskReportDetails = async (id) => {

    const response = await api.get(
        `/task-report/${id}`
    );

    return response.data;
};


// =====================================================
// REVIEW
// =====================================================

export const reviewTaskReport = async (
    id,
    data
) => {

    const response = await api.post(
        `/task-report/${id}/review`,
        data
    );

    return response.data;
};

// ======================================================
// EMPLOYEE REPORT
// ======================================================

// Get logged-in employee's submitted reports
export const employeeReportList = async () => {
    const response = await api.get(
        "/task-report/employee-list"
    );

    return response.data;
};


// Get single employee report details
export const employeeReportDetails = async (id) => {
    const response = await api.get(
        `/task-report/employee-details/${id}`
    );

    return response.data;
};