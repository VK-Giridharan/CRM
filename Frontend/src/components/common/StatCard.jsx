// Single dashboard figure. Every value shown is a real count returned by
// GET /dashboard - nothing here generates or estimates numbers.

const TONE_CLASSES = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    red: "bg-red-50 text-red-700 border-red-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200"
};

function StatCard({ label, value, tone = "slate", hint }) {

    const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.slate;

    return (

        <div className={`rounded-xl border p-5 shadow-sm ${toneClass}`}>

            <p className="text-sm font-medium opacity-80">
                {label}
            </p>

            <p className="mt-2 text-3xl font-bold">
                {Number.isFinite(Number(value)) ? Number(value) : 0}
            </p>

            {hint && (
                <p className="mt-1 text-xs opacity-70">
                    {hint}
                </p>
            )}

        </div>

    );

}

export default StatCard;
