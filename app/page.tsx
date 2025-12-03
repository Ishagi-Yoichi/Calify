"use client"
import Monthly from "@/components/Monthly";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [date,setDate]= useState(new Date());
  const [view,setView] = useState('month');

  return(
    <>
     <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">Calify</h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Your trusted partner for all your event management needs</p>
            <div className="mt-8">
              <Link 
                href="/events"
                className="inline-block px-8 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Manage Events
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <Monthly/>
          </div>
         
        </div>
     </div>
    </>
  )
}
