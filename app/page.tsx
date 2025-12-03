"use client"

import Monthly from "@/components/Monthly";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('month');

  // NextAuth session
  const { data: session, status } = useSession();

  return (
    <div className="bg-gray-100 min-h-screen overflow-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ------------------ HEADER + AUTH ------------------ */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-5xl font-bold text-gray-900">Calify</h1>

          {/* Auth Section */}
          {status === "loading" ? (
            <div>Loading...</div>
          ) : session ? (
            <div className="flex gap-4 items-center">
              <span className="text-gray-700">Hello, {session.user?.name || session.user?.email}</span>

              <button
                onClick={() => signOut()}
                className="px-3 py-1 bg-red-500 text-white rounded"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Sign In with Google
            </button>
          )}
        </div>

        {/* ------------------ SUBTITLE ------------------ */}
        <p className="text-gray-600 text-center text-xl mt-2">
          Your trusted partner for all your event management needs
        </p>

        {/* ------------------ CALENDAR ------------------ */}
        <div className="flex mt-7 items-center justify-center">
          <Monthly />
        </div>

      </div>
    </div>
  );
}
