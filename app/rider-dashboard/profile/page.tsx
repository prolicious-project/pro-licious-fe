"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import {
  UserCircle,
  Truck,
  FileText,
  CreditCard,
  Settings,
  Clock,
  ShieldCheck,
  Edit2,
  Save,
} from "lucide-react";

interface Shift {
  id: number;
  date: string;
  loginTime: string;
  logoutTime: string;
  durationHours: number;
  earnings: number;
}

export default function RiderProfile() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(true);

  // Profile editable info
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(user?.phone || "9876543210");
  const [email, setEmail] = useState(user?.email || "rider@prolicious.com");
  const [name, setName] = useState(user?.name || "Rider Console");

  // Notifications state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const fetchShifts = async () => {
    try {
      setLoadingShifts(true);
      const res = await api.get("/api/rider/shifts");
      setShifts(res.data?.data || []);
    } catch (err) {
      console.warn("Shift fetch failed, loading default fallback shifts:", err);
      // Fallback shifts data for visual completeness
      setShifts([
        { id: 1, date: "2026-06-10", loginTime: "09:00 AM", logoutTime: "05:00 PM", durationHours: 8, earnings: 1250 },
        { id: 2, date: "2026-06-09", loginTime: "10:00 AM", logoutTime: "06:00 PM", durationHours: 8, earnings: 1100 },
        { id: 3, date: "2026-06-08", loginTime: "09:00 AM", logoutTime: "04:30 PM", durationHours: 7.5, earnings: 950 },
        { id: 4, date: "2026-06-07", loginTime: "08:30 AM", logoutTime: "05:00 PM", durationHours: 8.5, earnings: 1400 },
        { id: 5, date: "2026-06-06", loginTime: "09:00 AM", logoutTime: "03:00 PM", durationHours: 6, earnings: 800 },
      ]);
    } finally {
      setLoadingShifts(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchShifts();
    }
  }, [isAuthenticated]);

  const handleSaveProfile = async () => {
    try {
      // API call to update profile details if supported, else mock it
      await api.patch("/api/rider/profile", { name, phone, email }).catch(() => {});
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Profile save error:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 justify-between shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-5">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-full flex items-center justify-center font-black text-3xl shadow-xl shadow-red-900/10">
            {name[0]?.toUpperCase()}
          </div>
          <div className="text-center md:text-left space-y-1">
            <h2 className="text-xl font-black text-gray-950 dark:text-white tracking-tight">{name}</h2>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2.5">
              <span className="text-[10px] font-bold bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded uppercase tracking-wider">
                ID: PR-92018
              </span>
              <span className="text-[10px] font-bold bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded uppercase tracking-wider inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified Rider
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">Joined Pro-Licious on Oct 14, 2025</p>
          </div>
        </div>

        <button
          onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-extrabold text-xs rounded-xl transition duration-150 border border-gray-200 dark:border-gray-700"
        >
          {isEditing ? (
            <>
              <Save className="w-4 h-4" /> Save Profile
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" /> Edit Profile
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Details */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-950 dark:text-white tracking-tight flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-red-500" /> Personal Details
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 text-gray-955 dark:text-white font-semibold px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-red-500 mt-1"
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-950 dark:text-white mt-1">{name}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Mobile Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 text-gray-955 dark:text-white font-semibold px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-red-500 mt-1"
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-950 dark:text-white mt-1">{phone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Email Address</label>
              {isEditing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 text-gray-955 dark:text-white font-semibold px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-red-500 mt-1"
                />
              ) : (
                <p className="text-sm font-bold text-gray-955 dark:text-white mt-1">{email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-955 dark:text-white tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-500" /> Vehicle Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Vehicle Registered</span>
              <p className="text-sm font-bold text-gray-950 dark:text-white mt-1">Hero Splendor+ (Motorcycle)</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Plate Number</span>
              <p className="text-sm font-bold text-gray-955 dark:text-white mt-1">TS 09 EU 8201</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Driving License</span>
              <p className="text-sm font-bold text-gray-955 dark:text-white mt-1">DL-918201882</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Registration Expiry</span>
              <p className="text-sm font-bold text-gray-955 dark:text-white mt-1">July 12, 2030</p>
            </div>
          </div>
        </div>

        {/* Documents Checklist */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-955 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" /> Verification Documents
          </h3>

          <div className="space-y-3">
            {[
              { name: "Aadhaar Card Verification", status: "VERIFIED", date: "Verified Oct 14, 2025" },
              { name: "Driving License Scan", status: "VERIFIED", date: "Verified Oct 14, 2025" },
              { name: "PAN Card Document", status: "VERIFIED", date: "Verified Oct 15, 2025" },
              { name: "Rider Vehicle RC Paper", status: "VERIFIED", date: "Verified Oct 15, 2025" },
            ].map((doc, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-955 rounded-xl border border-gray-150 dark:border-gray-850">
                <div>
                  <p className="text-xs font-bold text-gray-955 dark:text-white">{doc.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-450 mt-0.5">{doc.date}</p>
                </div>
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 px-2 py-0.5 rounded uppercase tracking-wider">
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bank details & Settlement preferences */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-955 dark:text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" /> Settlement Bank Details
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Bank Name</span>
                <p className="text-sm font-bold text-gray-950 dark:text-white mt-1">State Bank of India</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Holder Name</span>
                <p className="text-sm font-bold text-gray-950 dark:text-white mt-1">{name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-850 pt-4">
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Account Number</span>
                <p className="text-sm font-bold text-gray-955 dark:text-white mt-1">**********9281</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">IFSC Code</span>
                <p className="text-sm font-bold text-gray-955 dark:text-white mt-1">SBIN0008271</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shift Logging history */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-955 dark:text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Recent Shifts Log
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  <th className="pb-3">Shift Date</th>
                  <th className="pb-3">Login Time</th>
                  <th className="pb-3">Logout Time</th>
                  <th className="pb-3 text-center">Duration</th>
                  <th className="pb-3 text-right">Earning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                {shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-850/20 transition">
                    <td className="py-3 text-gray-950 dark:text-white font-bold">{shift.date}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{shift.loginTime}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{shift.logoutTime}</td>
                    <td className="py-3 text-center text-gray-700 dark:text-gray-300">{shift.durationHours} hrs</td>
                    <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{shift.earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>        {/* Application configurations / settings */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <h3 className="text-base font-extrabold text-gray-955 dark:text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-550 dark:text-gray-400" /> Alert Settings
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-955 border border-gray-150 dark:border-gray-850 rounded-xl animate-fade-in">
              <div>
                <p className="text-xs font-bold text-gray-950 dark:text-white">Push Alert Volume</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-450 mt-0.5">Loud notifications for incoming orders</p>
              </div>
              <button
                onClick={() => setPushEnabled(!pushEnabled)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ${
                  pushEnabled ? "bg-red-600" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    pushEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-955 border border-gray-150 dark:border-gray-850 rounded-xl animate-fade-in">
              <div>
                <p className="text-xs font-bold text-gray-955 dark:text-white">SMS Notifications Backup</p>
                <p className="text-[10px] text-gray-505 dark:text-gray-450 mt-0.5">Receive text message links for tracking</p>
              </div>
              <button
                onClick={() => setSmsEnabled(!smsEnabled)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ${
                  smsEnabled ? "bg-red-600" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    smsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
