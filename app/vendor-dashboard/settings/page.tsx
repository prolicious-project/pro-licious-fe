"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { 
  Save, 
  Settings, 
  Clock, 
  Building, 
  AlertCircle, 
  Check, 
  MapPin, 
  Phone, 
  Mail, 
  FileText,
  ToggleLeft,
  ToggleRight,
  User
} from "lucide-react";
import VendorSidebar from "@/components/VendorSidebar";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function VendorSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [operatingHours, setOperatingHours] = useState<any[]>([]);
  
  // Profile Form State
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storeGst, setStoreGst] = useState("");
  const [storeDesc, setStoreDesc] = useState("");

  // Operating Hours Editor State
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [hoursList, setHoursList] = useState<any[]>([]);

  // Notifications
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingHours, setUpdatingHours] = useState(false);

  const fetchData = async () => {
    try {
      const [profileRes, branchesRes, hoursRes] = await Promise.all([
        api.get("/api/vendor/profile"),
        api.get("/api/vendor/branches"),
        api.get("/api/vendor/operating-hours")
      ]);

      const prof = profileRes.data?.data;
      setProfile(prof);
      if (prof) {
        setStoreName(prof.name || "");
        setStorePhone(prof.phone || "");
        setStoreEmail(prof.email || "");
        setStoreGst(prof.gstNumber || "");
        setStoreDesc(prof.description || "");
      }

      const brs = branchesRes.data?.data || [];
      setBranches(brs);

      const hrs = hoursRes.data?.data || [];
      setOperatingHours(hrs);

      if (brs.length > 0) {
        setSelectedBranchId(brs[0].id);
        const branchHrs = hrs.find((h: any) => h.branchId === brs[0].id);
        initializeHoursList(brs[0].id, branchHrs?.hours || []);
      }
    } catch (e) {
      console.error("Error loading vendor settings data:", e);
      setErrorMsg("Failed to fetch settings details.");
    } finally {
      setLoading(false);
    }
  };

  const initializeHoursList = (branchId: number, existingHours: any[]) => {
    // Fill all 7 days of the week (0-6)
    const list = Array.from({ length: 7 }, (_, dayOfWeek) => {
      const existing = existingHours.find((h: any) => h.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        openTime: existing?.openTime ? existing.openTime.substring(0, 5) : "09:00",
        closeTime: existing?.closeTime ? existing.closeTime.substring(0, 5) : "22:00",
        closed: !existing
      };
    });
    setHoursList(list);
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    fetchData();
  }, [isAuthenticated, router]);

  // Handle branch dropdown change for operating hours editor
  const handleBranchChange = (branchId: number) => {
    setSelectedBranchId(branchId);
    const branchHrs = operatingHours.find((h: any) => h.branchId === branchId);
    initializeHoursList(branchId, branchHrs?.hours || []);
  };

  // Toggle branch active/inactive status
  const handleToggleBranchStatus = async (branchId: number, currentStatus: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/api/vendor/branches/${branchId}/status`, { status: nextStatus });
      setBranches(prev => prev.map(b => b.id === branchId ? { ...b, status: nextStatus } : b));
      setSuccessMsg("Branch status updated successfully!");
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || "Failed to update branch status.");
    }
  };

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setUpdatingProfile(true);

    try {
      const res = await api.patch("/api/vendor/profile", {
        name: storeName,
        phone: storePhone,
        email: storeEmail,
        gstNumber: storeGst,
        description: storeDesc
      });
      setProfile(res.data?.data);
      setSuccessMsg("Store profile updated successfully!");
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || "Failed to update store profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Save branch operating hours changes
  const handleSaveOperatingHours = async () => {
    if (!selectedBranchId) return;
    setErrorMsg("");
    setSuccessMsg("");
    setUpdatingHours(true);

    // Filter out closed days, format payload
    const activeHours = hoursList
      .filter(h => !h.closed)
      .map(h => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime + ":00",
        closeTime: h.closeTime + ":00"
      }));

    try {
      await api.put("/api/vendor/operating-hours", {
        branchId: selectedBranchId,
        hours: activeHours
      });
      
      // Update operatingHours local cache
      const updatedHrs = await api.get("/api/vendor/operating-hours");
      setOperatingHours(updatedHrs.data?.data || []);

      setSuccessMsg("Branch operating hours saved successfully!");
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || "Failed to save operating hours.");
    } finally {
      setUpdatingHours(false);
    }
  };

  const handleHoursFieldChange = (idx: number, field: string, value: any) => {
    setHoursList(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm">
      <VendorSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-650" /> Store Settings
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-gray-900 text-sm">{user?.name || "Vendor"}</p>
              <p className="text-xs text-yellow-500 font-bold font-mono">VENDOR</p>
            </div>
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold shadow-sm">
              {profile?.name?.[0] || user?.name?.[0] || "V"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Messages */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <Check className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Left Side: Store details & Branch Availability */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Store Profile Form */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                  <h3 className="font-extrabold text-gray-950 text-base border-b border-gray-100 pb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-red-600" /> Store Profile Details
                  </h3>
                  
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Store Name</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-white border border-gray-250 rounded-lg px-3 py-2 outline-none font-medium"
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">GST Number</label>
                        <input
                          type="text"
                          placeholder="22AAAAA0000A1Z5"
                          className="w-full bg-white border border-gray-255 rounded-lg px-3 py-2 outline-none font-medium"
                          value={storeGst}
                          onChange={(e) => setStoreGst(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Phone Number</label>
                        <div className="flex">
                          <span className="bg-gray-100 border border-r-0 border-gray-200 px-3 py-2 rounded-l-lg text-gray-500 font-semibold flex items-center">+91</span>
                          <input
                            type="text"
                            required
                            className="flex-1 bg-white border border-gray-200 rounded-r-lg px-3 py-2 outline-none font-medium"
                            value={storePhone}
                            onChange={(e) => setStorePhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-medium"
                          value={storeEmail}
                          onChange={(e) => setStoreEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Store Description</label>
                      <textarea
                        rows={3}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none resize-none font-medium"
                        placeholder="Introduce your meat cut offerings..."
                        value={storeDesc}
                        onChange={(e) => setStoreDesc(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={updatingProfile}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
                      >
                        <Save className="w-4 h-4" /> {updatingProfile ? "Saving Details..." : "Save Store Details"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Branches & Active/Inactive Toggles */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-gray-950 text-base border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Building className="w-4 h-4 text-red-600" /> Manage Branches & Availability
                  </h3>
                  
                  {branches.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No branches registered.</div>
                  ) : (
                    <div className="space-y-3">
                      {branches.map((b) => {
                        const isActive = b.status === "ACTIVE";
                        return (
                          <div key={b.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 bg-gray-50/20">
                            <div className="flex items-start gap-2.5">
                              <MapPin className="w-4.5 h-4.5 text-red-650 mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{b.branchName}</h4>
                                <p className="text-xs text-gray-500 mt-0.5 leading-normal">{b.address || "Hyderabad Branch"}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                              }`}>
                                {b.status}
                              </span>
                              <button
                                onClick={() => handleToggleBranchStatus(b.id, b.status)}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors border-none outline-none"
                                title="Toggle Branch status active/inactive"
                              >
                                {isActive ? (
                                  <ToggleRight className="w-8 h-8 text-green-600" />
                                ) : (
                                  <ToggleLeft className="w-8 h-8 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Side: Operating Hours Manager */}
              <div className="space-y-6">
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-gray-950 text-base border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" /> Operating Hours
                  </h3>

                  {branches.length > 0 && selectedBranchId ? (
                    <div className="space-y-4">
                      {/* Branch Selector Dropdown */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Branch</label>
                        <select
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-bold"
                          value={selectedBranchId}
                          onChange={(e) => handleBranchChange(parseInt(e.target.value))}
                        >
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.branchName}</option>
                          ))}
                        </select>
                      </div>

                      {/* Day list with opens/closes selectors */}
                      <div className="space-y-3 pt-2">
                        {hoursList.map((h, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 text-xs border-b border-gray-50 pb-2">
                            <span className="font-bold text-gray-700 w-20">{DAYS_OF_WEEK[h.dayOfWeek]}</span>
                            
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                disabled={h.closed}
                                className="bg-white border border-gray-200 rounded px-1.5 py-0.5 outline-none font-semibold disabled:opacity-40"
                                value={h.openTime}
                                onChange={(e) => handleHoursFieldChange(i, "openTime", e.target.value)}
                              />
                              <span className="text-gray-400">-</span>
                              <input
                                type="time"
                                disabled={h.closed}
                                className="bg-white border border-gray-200 rounded px-1.5 py-0.5 outline-none font-semibold disabled:opacity-40"
                                value={h.closeTime}
                                onChange={(e) => handleHoursFieldChange(i, "closeTime", e.target.value)}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleHoursFieldChange(i, "closed", !h.closed)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                h.closed 
                                  ? "bg-red-50 text-red-600 border-red-150" 
                                  : "bg-green-50 text-green-600 border-green-150"
                              }`}
                            >
                              {h.closed ? "CLOSED" : "OPEN"}
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleSaveOperatingHours}
                        disabled={updatingHours}
                        className="w-full mt-4 py-2.5 bg-red-650 hover:bg-red-750 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
                      >
                        <Save className="w-4 h-4" /> {updatingHours ? "Saving Hours..." : "Save Operating Hours"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-6">No branches configured.</p>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
