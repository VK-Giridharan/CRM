import WorkerTasks from "../../components/worker/WorkerTasks";

// Interns follow the same split-task workflow as Employees, so the same
// component and the same backend endpoints are used. The backend authorises
// both worker roles and scopes every query to the signed-in user.
function InternTasks() {
    return <WorkerTasks roleLabel="Intern" />;
}

export default InternTasks;
