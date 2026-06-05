"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import { Navigation, Phone, CheckCircle, MapPin, AlertCircle, Package, Clock, DollarSign } from "lucide-react";

export default function RiderDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  const [isOnline, setIsOnline] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<any>(null);
  const [activeOrderDetail, setActiveOrderDetail] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  const fetchRiderData = async () => {
    try {
      const [ordersRes, earningsRes] = await Promise.all([
        api.get("/api/rider/orders"),
        api.get("/api/rider/earnings/summary"),
      ]);
      const assgs = ordersRes.data?.data || [];
      setAssignments(assgs);
      setEarnings(earningsRes.data?.data);

      // Find an active assignment (either PENDING or ACCEPTED status in rider_assignments)
      const active = assgs.find((a: any) => ["PENDING", "ACCEPTED"].includes(a.status));
      setActiveAssignment(active);

      if (active) {
        // Fetch order details
        const detailRes = await api.get(`/api/rider/orders/${active.orderId}`);
        setActiveOrderDetail(detailRes.data?.data);
      } else {
        setActiveOrderDetail(null);
      }
    } catch (err) {
      console.error("Rider dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    fetchRiderData();

    const socket = getSocket(token || undefined);
    socket.connect();
    socket.on("order_assigned", () => {
      fetchRiderData();
    });

    return () => {
      socket.off("order_assigned");
      socket.disconnect();
    };
  }, [isAuthenticated, router, token]);

  const toggleOnline = async () => {
    try {
      await api.patch("/api/rider/availability", { isOnline: !isOnline });
      setIsOnline(prev => !prev);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptAssignment = async (orderId: number) => {
    try {
      setLoading(true);
      await api.patch(`/api/rider/orders/${orderId}/accept`);
      await fetchRiderData();
    } catch (e) {
      console.error("Error accepting order:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAssignment = async (orderId: number) => {
    try {
      setLoading(true);
      await api.patch(`/api/rider/orders/${orderId}/reject`);
      await fetchRiderData();
    } catch (e) {
      console.error("Error rejecting order:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, action: string) => {
    try {
      setLoading(true);
      await api.patch(`/api/rider/orders/${orderId}/${action}`);
      await fetchRiderData();
    } catch (e) {
      console.error(`Error updating order status (${action}):`, e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (orderId: number) => {
    try {
      setLoading(true);
      setOtpError("");
      await api.post(`/api/rider/orders/${orderId}/deliver`, { otp: otpInput });
      setOtpInput("");
      await fetchRiderData();
    } catch (e: any) {
      console.error("Error confirming delivery:", e);
      setOtpError(e.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine order tracking stage
  const getOrderStageIndex = (status: string) => {
    const STATUS_STEPS: Record<string, number> = {
      RIDER_ASSIGNED: 0,
      ARRIVED_VENDOR: 1,
      PICKED_UP: 2,
      ARRIVED_CUSTOMER: 3,
      DELIVERED: 4,
    };
    return STATUS_STEPS[status] !== undefined ? STATUS_STEPS[status] : -1;
  };

  const orderStatus = activeOrderDetail?.order?.status;

  return (
    <div className="flex h-screen bg-gray-100 flex-col md:flex-row font-sans text-sm">
      {/* Side Panel */}
      <aside className="w-full md:w-85 bg-white border-r border-gray-200 flex flex-col shadow-xl z-20 overflow-hidden">
        <div className="p-6 bg-red-600 text-white flex justify-between items-center flex-shrink-0">
          <div>
            <h1 className="font-bold text-xl tracking-tight">Rider Console</h1>
            <p className="text-xs text-red-200">{user?.name || "Rider"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase">{isOnline ? "Online" : "Offline"}</span>
            <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isOnline ? "bg-green-400" : "bg-red-800"}`} onClick={toggleOnline}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isOnline ? "translate-x-6" : "translate-x-0"}`}></div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
            </div>
          ) : !activeAssignment ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-16">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                <Navigation className="w-10 h-10 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{isOnline ? "Looking for orders..." : "You are offline"}</h3>
                <p className="text-xs text-gray-500 max-w-xs px-4">
                  {isOnline ? "New delivery opportunities in your zone will appear here." : "Toggle your status to online to start receiving delivery requests."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider">Active Assignment</h3>
              
              {/* Assignment Card */}
              <div className="bg-white rounded-2xl border border-red-100 shadow-md overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                  <span className="font-bold text-red-600 text-sm">#{activeOrderDetail?.order?.orderNumber || "ORDER"}</span>
                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {orderStatus}
                  </span>
                </div>
                
                <div className="p-4 space-y-4 relative">
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200"></div>
                  
                  {/* Vendor Location */}
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-white border-4 border-red-600 flex-shrink-0 mt-1"></div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">Pickup From</p>
                      <p className="font-bold text-gray-900">Vendor #{activeOrderDetail?.order?.vendorId}</p>
                      <p className="text-xs text-gray-500">Go to vendor branch to collect order items.</p>
                    </div>
                  </div>
                  
                  {/* Customer Location */}
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-white border-4 border-green-600 flex-shrink-0 mt-1"></div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">Deliver To</p>
                      <p className="font-bold text-gray-900">Customer #{activeOrderDetail?.order?.customerId}</p>
                      <p className="text-xs text-gray-500">
                        {activeOrderDetail?.address
                          ? `${activeOrderDetail.address.houseNumber || ""}, ${activeOrderDetail.address.street || ""}, ${activeOrderDetail.address.city || ""}`
                          : "Delivery Address"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Timeline */}
                {activeAssignment.status === "ACCEPTED" && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50/50">
                    <div className="flex justify-between mb-1.5">
                      {["Assigned", "At Vendor", "Picked", "Arrived", "Done"].map((step, i) => (
                        <div key={i} className={`text-[9px] font-bold text-center ${getOrderStageIndex(orderStatus) >= i ? "text-red-600" : "text-gray-300"}`}>
                          {step}
                        </div>
                      ))}
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${Math.max(0, ((getOrderStageIndex(orderStatus) + 1) / 5) * 100)}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  {activeAssignment.status === "PENDING" ? (
                    <div className="flex gap-3">
                      <button onClick={() => handleAcceptAssignment(activeAssignment.orderId)} className="flex-1 bg-green-600 hover:bg-green-700 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                        <CheckCircle className="w-4 h-4" /> Accept
                      </button>
                      <button onClick={() => handleRejectAssignment(activeAssignment.orderId)} className="flex-1 bg-red-600 hover:bg-red-700 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                        <AlertCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orderStatus === "RIDER_ASSIGNED" && (
                        <button onClick={() => updateOrderStatus(activeAssignment.orderId, "arrived-vendor")} className="w-full bg-red-600 hover:bg-red-700 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 shadow-md transition-colors">
                          <Package className="w-4 h-4" /> Arrived at Vendor
                        </button>
                      )}
                      {orderStatus === "ARRIVED_VENDOR" && (
                        <button onClick={() => updateOrderStatus(activeAssignment.orderId, "picked-up")} className="w-full bg-red-600 hover:bg-red-700 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 shadow-md transition-colors">
                          <CheckCircle className="w-4 h-4" /> Picked Up Items
                        </button>
                      )}
                      {orderStatus === "PICKED_UP" && (
                        <button onClick={() => updateOrderStatus(activeAssignment.orderId, "arrived-customer")} className="w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 shadow-md transition-colors">
                          <MapPin className="w-4 h-4" /> Arrived at Customer
                        </button>
                      )}
                      {orderStatus === "ARRIVED_CUSTOMER" && (
                        <div className="space-y-2.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter Delivery OTP"
                              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-bold text-center tracking-widest text-lg"
                              value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value)}
                            />
                            <button onClick={() => handleConfirmDelivery(activeAssignment.orderId)} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-bold text-white shadow-sm transition-colors">
                              Confirm
                            </button>
                          </div>
                          {otpError && <p className="text-xs text-red-600 font-medium">{otpError}</p>}
                          <p className="text-[10px] text-gray-500">Ask the customer for the verification OTP sent to their mobile device.</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <a href={`tel:${activeOrderDetail?.address?.phone || "9999999999"}`} className="flex-1 bg-white border border-gray-200 py-2 rounded-lg font-bold text-xs text-gray-700 flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                          <Phone className="w-3.5 h-3.5" /> Call Customer
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assignments List */}
          {assignments.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Assignment Log ({assignments.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {assignments.map((assg: any) => (
                  <div key={assg.id} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-900 text-xs">Order #{assg.orderId}</span>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">Assigned: {new Date(assg.assignedAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      assg.status === "COMPLETED" ? "bg-green-50 text-green-600" :
                      assg.status === "REJECTED" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"
                    }`}>
                      {assg.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Earning Stats */}
        <div className="p-4 border-t border-gray-200 bg-white grid grid-cols-2 gap-4 flex-shrink-0">
          <div className="text-center border-r border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5 flex items-center justify-center gap-1"><DollarSign className="w-3 h-3 text-green-500" /> Today's Earnings</p>
            <p className="font-extrabold text-green-600 text-lg">₹{parseFloat(earnings?.today || 0).toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5 flex items-center justify-center gap-1"><Clock className="w-3 h-3 text-blue-500" /> Total Shifts</p>
            <p className="font-extrabold text-gray-900 text-lg">{earnings?.count || 0}</p>
          </div>
        </div>
      </aside>

      {/* Map Area */}
      <main className="flex-1 relative bg-blue-50 overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop")' }}></div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {activeAssignment && activeOrderDetail ? (
            <>
              <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <path d="M 300,500 Q 500,200 800,400" fill="none" stroke="#dc2626" strokeWidth="6" strokeDasharray="10,10" className="opacity-70 animate-pulse" />
              </svg>
              <div className="absolute flex flex-col items-center" style={{ left: "40%", top: "45%" }}>
                <div className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">RIDER (YOU)</div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-red-600">
                  <Navigation className="w-5 h-5 text-red-600 fill-current" />
                </div>
              </div>
              <div className="absolute flex flex-col items-center" style={{ left: "60%", top: "30%" }}>
                <div className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">CUSTOMER</div>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-green-600">
                  <MapPin className="w-4 h-4 text-green-600 fill-current" />
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg text-center">
              <Navigation className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-bold text-gray-700 text-sm">No Active delivery</p>
              <p className="text-xs text-gray-500">Go online to get assigned orders</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

