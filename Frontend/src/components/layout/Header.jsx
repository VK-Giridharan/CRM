import { useNavigate } from "react-router-dom";

function Header() {

    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("user"));

    const handleLogout = () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");

    };

    return (

        <header className="h-16 bg-white shadow flex items-center justify-between px-6">

            <div>

                <h1 className="text-xl font-bold">
                    Prodigit CRM
                </h1>

            </div>

            <div className="flex items-center gap-4">

                <div className="text-right">

                    <h2 className="font-semibold">
                        {user?.first_name} {user?.last_name}
                    </h2>

                    <p className="text-sm text-gray-500">
                        {user?.role}
                    </p>

                </div>

                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                    Logout
                </button>

            </div>

        </header>

    );
}

export default Header;