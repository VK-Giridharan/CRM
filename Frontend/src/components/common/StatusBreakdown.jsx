import StatusBadge from "./StatusBadge";

// Renders a { statusName: count } map as a labelled list.
// Shows an explicit empty state rather than an empty box when there is
// genuinely nothing to count.

function StatusBreakdown({ title, data }) {

    const entries = Object.entries(data || {});

    const total = entries.reduce(
        (sum, [, value]) => sum + (Number(value) || 0),
        0
    );

    return (

        <div className="bg-white rounded-xl shadow p-6">

            <h3 className="text-lg font-bold text-gray-800 mb-4">
                {title}
            </h3>

            {entries.length === 0 || total === 0 ? (

                <p className="text-gray-500 text-sm py-4">
                    Nothing to show yet
                </p>

            ) : (

                <div className="space-y-3">

                    {entries.map(([status, count]) => (

                        <div
                            key={status}
                            className="flex items-center justify-between"
                        >

                            <StatusBadge status={status} />

                            <span className="font-semibold text-gray-800">
                                {Number(count) || 0}
                            </span>

                        </div>

                    ))}

                </div>

            )}

        </div>

    );

}

export default StatusBreakdown;
