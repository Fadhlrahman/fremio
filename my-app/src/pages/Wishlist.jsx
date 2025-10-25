import { useMemo, useState } from "react";

// Mock data frontend-only (backend nanti)
const MOCK_WISHLIST = [
  { id: "fw-301", title: "Fremio Series Blue 3x2", size: "3x2", color: "Blue" },
  { id: "fw-302", title: "Fremio Series Pink 3", size: "3x3", color: "Pink" },
  {
    id: "fw-401",
    title: "Everything You Are 3x2",
    size: "3x2",
    color: "Cream",
  },
  { id: "fw-105", title: "Fremio Series Black 3", size: "3x3", color: "Black" },
  { id: "fw-205", title: "Fremio Series Green 3", size: "3x3", color: "Green" },
  {
    id: "fw-501",
    title: "Fremio Series Maroon 3",
    size: "3x3",
    color: "Maroon",
  },
];

export default function Wishlist() {
  const initial = useMemo(() => MOCK_WISHLIST, []);
  const [items, setItems] = useState(initial);

  const removeItem = (id) =>
    setItems((prev) => prev.filter((x) => x.id !== id));

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#fdf7f4] via-white to-[#f7f1ed] py-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#e0b7a9] to-[#c89585] p-8">
            <h2 className="text-3xl font-bold text-white">Wishlist</h2>
            <p className="text-white/90 mt-2">Frame yang kamu sukai</p>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {items.length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center text-gray-700">
                Belum ada item di Wishlist.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm"
                  >
                    <div className="h-36 bg-gradient-to-br from-[#f6ece8] to-white grid place-items-center text-sm text-gray-500">
                      {/* Placeholder thumbnail; nanti ganti dengan gambar frame */}
                      <span className="px-2 py-1 rounded bg-white/70 ring-1 ring-black/5">
                        {w.size}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="font-semibold text-gray-900 line-clamp-2">
                        {w.title}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Color: {w.color}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
                          Open
                        </button>
                        <button
                          onClick={() => removeItem(w.id)}
                          className="px-3 py-2 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
