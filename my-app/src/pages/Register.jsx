import { Link } from "react-router-dom";

const ACCENT = "#E0B7A9";
const ACCENT_DARK = "#caa396";

export default function Register() {
  return (
    <section className="anchor">
      <div className="container">
        {/* Title bar */}
        <div className="h-12 flex items-center border-b border-[#ecdeda]/80 bg-[#fbf4f2]">
          <h1 className="px-5 text-xl font-semibold tracking-wide">Register</h1>
        </div>

        {/* Card */}
        <div className="py-10">
          <div className="mx-auto w-full max-w-[520px] rounded-2xl border border-zinc-200 shadow-[0_3px_0_#d6d3d1] bg-white">
            {/* Tabs */}
            <div className="flex items-center gap-3 p-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border border-zinc-300 hover:bg-zinc-50"
              >
                <span>🔓</span> Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border border-zinc-300 shadow-[0_3px_0_#c9c9c9]"
                style={{ background: ACCENT, color: "#2a2a2a" }}
              >
                <span>👥</span> Register
              </Link>
            </div>

            <div className="px-6 pb-6">
              {/* Name grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-full border-2 border-zinc-300 px-4 h-11 shadow-[0_6px_16px_rgba(0,0,0,.06)] outline-none focus:border-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-full border-2 border-zinc-300 px-4 h-11 shadow-[0_6px_16px_rgba(0,0,0,.06)] outline-none focus:border-zinc-800"
                  />
                </div>
              </div>

              {/* Email */}
              <label className="block text-sm font-medium mt-4 mb-1">
                Email Address
              </label>
              <input
                type="email"
                className="w-full rounded-full border-2 border-zinc-300 px-4 h-11 shadow-[0_6px_16px_rgba(0,0,0,.06)] outline-none focus:border-zinc-800"
                placeholder="you@example.com"
              />

              {/* Passwords */}
              <label className="block text-sm font-medium mt-4 mb-1">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-full border-2 border-zinc-300 px-4 h-11 shadow-[0_6px_16px_rgba(0,0,0,.06)] outline-none focus:border-zinc-800"
                placeholder="••••••••"
              />

              <label className="block text-sm font-medium mt-4 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                className="w-full rounded-full border-2 border-zinc-300 px-4 h-11 shadow-[0_6px_16px_rgba(0,0,0,.06)] outline-none focus:border-zinc-800"
                placeholder="••••••••"
              />

              {/* TOS */}
              <label className="mt-3 inline-flex items-start gap-2 text-xs leading-5 text-zinc-600">
                <input type="checkbox" className="mt-1 accent-black" /> I agree
                to the Terms of Service and Privacy Policy
              </label>

              {/* Submit */}
              <button
                className="mt-5 w-full rounded-full px-5 py-2 font-semibold"
                style={{
                  background: ACCENT,
                  color: "#2a2a2a",
                  boxShadow: `0 6px 0 ${ACCENT_DARK}, 0 18px 40px rgba(0,0,0,.12)`,
                }}
                onMouseDown={(e) =>
                  (e.currentTarget.style.boxShadow = `0 4px 0 ${ACCENT_DARK}`)
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.boxShadow = `0 6px 0 ${ACCENT_DARK}, 0 18px 40px rgba(0,0,0,.12)`)
                }
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
