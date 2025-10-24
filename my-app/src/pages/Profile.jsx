import { useAuth } from "../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[#e0b7a9] to-[#c89585] bg-clip-text text-transparent">
              Your Profile
            </h2>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="space-y-4">
            <div className="border-b pb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Name
              </label>
              <p className="text-lg text-gray-900">
                {user?.name || `${user?.firstName} ${user?.lastName}` || "-"}
              </p>
            </div>

            <div className="border-b pb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Email
              </label>
              <p className="text-lg text-gray-900">{user?.email || "-"}</p>
            </div>

            <div className="border-b pb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Member Since
              </label>
              <p className="text-lg text-gray-900">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"}
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gradient-to-r from-[#fdf7f4] to-[#f7f1ed] rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              🎉 Thank you for being part of Fremio community!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
