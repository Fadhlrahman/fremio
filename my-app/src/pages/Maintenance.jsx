import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function Maintenance() {
  useEffect(() => {
    document.title = "Maintenance - Fremio";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Sedang Maintenance
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            Fremio sedang dalam perbaikan untuk memberikan pengalaman yang lebih baik.
            Silakan coba lagi dalam beberapa saat.
          </p>

          {/* Estimated Time */}
          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-purple-700 font-medium">
              ⏱️ Perkiraan selesai: 15-30 menit
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Login Admin / Whitelist
            </Link>

            <div className="text-sm text-gray-500">
              Butuh bantuan?{" "}
              <Link
                to="/help-center"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Hubungi Support
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            © 2025 Fremio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
