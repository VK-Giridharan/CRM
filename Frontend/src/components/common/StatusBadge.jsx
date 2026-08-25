// Shared status pill. Covers every value in the task / split-task / report
// status vocabulary so the same colour means the same thing on every page.

const STATUS_CLASSES = {
    // split task + task
    "Pending": "bg-yellow-100 text-yellow-700",
    "In Progress": "bg-blue-100 text-blue-700",
    "Submitted": "bg-purple-100 text-purple-700",
    "Rework": "bg-orange-100 text-orange-700",
    "Completed": "bg-green-100 text-green-700",
    "Cancelled": "bg-red-100 text-red-700",

    // report review
    "Approved": "bg-green-100 text-green-700",

    // lead / meeting
    "Meeting Scheduled": "bg-blue-100 text-blue-700",
    "Future Business": "bg-indigo-100 text-indigo-700",
    "Converted": "bg-green-100 text-green-700",
    "Closed": "bg-gray-200 text-gray-700",
    "Scheduled": "bg-blue-100 text-blue-700"
};

function StatusBadge({ status, fallback = "-" }) {

    if (!status) {
        return (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
                {fallback}
            </span>
        );
    }

    const className =
        STATUS_CLASSES[status] || "bg-gray-100 text-gray-700";

    return (
        <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${className}`}
        >
            {status}
        </span>
    );

}

export default StatusBadge;
