// "use client";

// import React, { useState } from "react";
// import { MapPin, Phone, CheckCircle, AlertCircle, Package, Clock } from "lucide-react";
// import { api } from "@/lib/axios";

// type Props = {
//   order: any;
//   onStatusChange?: () => void;
// };

// export default function RiderDeliveryCard({ order, onStatusChange }: Props) {
//   const [loading, setLoading] = useState(false);
//   const [otp, setOtp] = useState("");
//   const [error, setError] = useState("");

//   const status = order?.status || "RIDER_ASSIGNED";
//   const orderNumber = order?.orderNumber || `#${order?.id}`;
//   const vendor = order?.vendor || {};
//   const customer = order?.customer || {};
//   const address = order?.address || {};

//   const getStatusColor = (s: string) => {
//     const colors: Record<string, string> = {
//       RIDER_ASSIGNED: "bg-yellow-50 text-yellow-700 border-yellow-200",
//       ARRIVED_VENDOR: "bg-blue-50 text-blue-700 border-blue-200",
//       PICKED_UP: "bg-purple-50 text-purple-700 border-purple-200",
//       ARRIVED_CUSTOMER: "bg-orange-50 text-orange-700 border-orange-200",
//       DELIVERED: "bg-green-50 text-green-700 border-green-200",
//     };
//     return colors[s] || colors.RIDER_ASSIGNED;
//   };

//   const getStageIndex = (s: string) => {
//     const stages: Record<string, number> = {
//       RIDER_ASSIGNED: 0,
//       ARRIVED_VENDOR: 1,
//       PICKED_UP: 2,
//       ARRIVED_CUSTOMER: 3,
//       DELIVERED: 4,
//     };
//     return stages[s] ?? -1;
//   };

//   const handleAction = async (action: string) => {
//     try {
//       setLoading(true);
//       setError("");
//       await api.patch(`/api/rider/orders/${order.id}/${action}`);
//       if (onStatusChange) onStatusChange();
//     } catch (e: any) {
//       setError(e.response?.data?.message || "Action failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleConfirmDelivery = async () => {
//     if (!otp.trim()) {
//       setError("Please enter OTP");
//       return;
//     }
//     try {
//       setLoading(true);
//       setError("");
//       await api.post(`/api/rider/orders/${order.id}/deliver`, { otp });
//       setOtp("");
//       if (onStatusChange) onStatusChange();
//     } catch (e: any) {
//       setError(e.response?.data?.message || "Invalid OTP");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const stageIndex = getStageIndex(status);

//   return (
//     <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//       {/* Header */}
//       <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200 flex justify-between items-center">
//         <div>
//           <h3 className="font-bold text-lg text-gray-900">{orderNumber}</h3>
//           <p className="text-xs text-gray-600">From {vendor?.name || "Vendor"}</p>
//         </div>
//         <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
//           {status.replace(/_/g, " ")}
//         </div>
//       </div>

//       {/* Progress Bar */}
//       <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
//         <div className="flex justify-between text-xs font-bold mb-2">
//           {["Assigned", "At Vendor", "Picked", "Arrived", "Done"].map((label, i) => (
//             <span key={label} className={stageIndex >= i ? "text-red-600" : "text-gray-300"}>
//               {label}
//             </span>
//           ))}
//         </div>
//         <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
//           <div
//             className="h-full bg-red-600 transition-all duration-300"
//             style={{ width: `${Math.max(0, ((stageIndex + 1) / 5) * 100)}%` }}
//           ></div>
//         </div>
//       </div>

//       {/* Details */}
//       <div className="px-6 py-4 space-y-4">
//         {/* Pickup */}
//         <div className="flex gap-3">
//           <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
//             <Package className="w-3 h-3" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-xs text-gray-500 font-bold uppercase">Pickup</p>
//             <p className="font-bold text-gray-900 truncate">{vendor?.name || "Vendor"}</p>
//             {vendor?.address && (
//               <p className="text-xs text-gray-600 line-clamp-2">{vendor.address}</p>
//             )}
//           </div>
//         </div>

//         {/* Delivery */}
//         <div className="flex gap-3">
//           <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
//             <MapPin className="w-3 h-3" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-xs text-gray-500 font-bold uppercase">Delivery</p>
//             <p className="font-bold text-gray-900 truncate">{customer?.name || "Customer"}</p>
//             {address && (
//               <p className="text-xs text-gray-600 line-clamp-2">
//                 {address.houseNumber && `${address.houseNumber}, `}
//                 {address.street && `${address.street}, `}
//                 {address.city}
//               </p>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Actions */}
//       <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-3">
//         {status === "RIDER_ASSIGNED" && (
//           <button
//             disabled={loading}
//             onClick={() => handleAction("arrived-vendor")}
//             className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition"
//           >
//             <Package className="w-4 h-4" /> Arrived at Vendor
//           </button>
//         )}

//         {status === "ARRIVED_VENDOR" && (
//           <button
//             disabled={loading}
//             onClick={() => handleAction("picked-up")}
//             className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition"
//           >
//             <CheckCircle className="w-4 h-4" /> Picked Up Items
//           </button>
//         )}

//         {status === "PICKED_UP" && (
//           <button
//             disabled={loading}
//             onClick={() => handleAction("arrived-customer")}
//             className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition"
//           >
//             <MapPin className="w-4 h-4" /> Arrived at Customer
//           </button>
//         )}

//         {status === "ARRIVED_CUSTOMER" && (
//           <div className="space-y-2">
//             <label className="block text-xs font-bold text-gray-700">Enter Delivery OTP</label>
//             <div className="flex gap-2">
//               <input
//                 type="text"
//                 placeholder="OTP"
//                 value={otp}
//                 onChange={(e) => setOtp(e.target.value)}
//                 className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-bold text-center tracking-widest"
//                 disabled={loading}
//               />
//               <button
//                 disabled={loading}
//                 onClick={handleConfirmDelivery}
//                 className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-bold transition"
//               >
//                 Confirm
//               </button>
//             </div>
//             {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
//           </div>
//         )}

//         {status === "DELIVERED" && (
//           <div className="text-center py-2">
//             <p className="text-green-600 font-bold flex items-center justify-center gap-2">
//               <CheckCircle className="w-5 h-5" /> Order Delivered
//             </p>
//           </div>
//         )}

//         {status !== "DELIVERED" && (
//           <a
//             href={`tel:${customer?.phone || "9999999999"}`}
//             className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition"
//           >
//             <Phone className="w-4 h-4" /> Call Customer
//           </a>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useState } from "react";
import {
  MapPin,
  Phone,
  CheckCircle,
  Package,
} from "lucide-react";
import { api } from "@/lib/axios";

interface Order {
  id: number;
  orderId?: number;
  orderNumber: string;
  status: string;
  vendor?: any;
  customer?: any;
  address?: any;
}

interface Props {
  order: Order;
  onStatusChange?: () => void;
}

export default function RiderDeliveryCard({ order, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const status = order?.status || "RIDER_ASSIGNED";
  const orderNumber = order?.orderNumber || `#${order?.id}`;
  const vendor = order?.vendor || {};
  const customer = order?.customer || {};
  const address = order?.address || {};

  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      RIDER_ASSIGNED: "bg-yellow-50 text-yellow-700 border-yellow-200",
      ARRIVED_VENDOR: "bg-blue-50 text-blue-700 border-blue-200",
      PICKED_UP: "bg-purple-50 text-purple-700 border-purple-200",
      ARRIVED_CUSTOMER: "bg-orange-50 text-orange-700 border-orange-200",
      DELIVERED: "bg-green-50 text-green-700 border-green-200",
    };
    return colors[s] || colors.RIDER_ASSIGNED;
  };

  const getStageIndex = (s: string) => {
    const stages: Record<string, number> = {
      RIDER_ASSIGNED: 0,
      ARRIVED_VENDOR: 1,
      PICKED_UP: 2,
      ARRIVED_CUSTOMER: 3,
      DELIVERED: 4,
    };
    return stages[s] ?? -1;
  };

  const handleAction = async (action: string) => {
    try {
      setLoading(true);
      setError("");
      
      const orderId = order.id || order.orderId;
      if (!orderId) {
        setError("Order ID missing");
        setLoading(false);
        return;
      }

      await api.patch(`/api/rider/orders/${orderId}/${action}`);
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.response?.data?.message || "Action failed. Please try again.");
      console.error("Action error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!otp.trim()) {
      setError("Please enter OTP");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const orderId = order.id || order.orderId;
      if (!orderId) {
        setError("Order ID missing");
        setLoading(false);
        return;
      }

      await api.post(`/api/rider/orders/${orderId}/deliver`, { otp });
      setOtp("");
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
      console.error("Delivery error:", err);
    } finally {
      setLoading(false);
    }
  };

  const stageIndex = getStageIndex(status);

  const customerPhone = customer?.phone || address?.phone || "";
  const vendorName = vendor?.name || "Vendor";
  const customerName = customer?.name || "Customer";
  const fullAddress = address
    ? `${address.houseNumber || ""} ${address.street || ""} ${address.city || ""}`.trim()
    : "Address not available";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{orderNumber}</h3>
            <p className="text-xs text-gray-600 mt-1">From {vendorName}</p>
          </div>
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(
              status
            )}`}
          >
            {status.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex justify-between text-xs font-bold mb-3">
          {["Assigned", "At Vendor", "Picked", "Arrived", "Done"].map(
            (label, i) => (
              <span
                key={label}
                className={stageIndex >= i ? "text-red-600" : "text-gray-300"}
              >
                {label}
              </span>
            )
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 transition-all duration-300"
            style={{
              width: `${Math.max(0, ((stageIndex + 1) / 5) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="px-6 py-4 space-y-4">
        {/* Pickup */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
            <Package className="w-3 h-3" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-bold uppercase">Pickup</p>
            <p className="font-bold text-gray-900 truncate">{vendorName}</p>
            {vendor?.address && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {vendor.address}
              </p>
            )}
          </div>
        </div>

        {/* Delivery */}
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
            <MapPin className="w-3 h-3" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-bold uppercase">Delivery</p>
            <p className="font-bold text-gray-900 truncate">{customerName}</p>
            <p className="text-xs text-gray-600 line-clamp-2">{fullAddress}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-xs text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-3">
        {status === "RIDER_ASSIGNED" && (
          <button
            disabled={loading}
            onClick={() => handleAction("arrived-vendor")}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition"
          >
            <Package className="w-4 h-4" />
            {loading ? "Updating..." : "Arrived at Vendor"}
          </button>
        )}

        {status === "ARRIVED_VENDOR" && (
          <button
            disabled={loading}
            onClick={() => handleAction("picked-up")}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition"
          >
            <CheckCircle className="w-4 h-4" />
            {loading ? "Updating..." : "Picked Up Items"}
          </button>
        )}

        {status === "PICKED_UP" && (
          <button
            disabled={loading}
            onClick={() => handleAction("arrived-customer")}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition"
          >
            <MapPin className="w-4 h-4" />
            {loading ? "Updating..." : "Arrived at Customer"}
          </button>
        )}

        {status === "ARRIVED_CUSTOMER" && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              Enter Delivery OTP
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-bold text-center tracking-widest disabled:bg-gray-50 disabled:cursor-not-allowed"
                maxLength={6}
              />
              <button
                disabled={loading}
                onClick={handleConfirmDelivery}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold transition"
              >
                {loading ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        )}

        {status === "DELIVERED" && (
          <div className="text-center py-2">
            <p className="text-green-600 font-bold flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> Order Delivered
            </p>
          </div>
        )}

        {status !== "DELIVERED" && (
          <a
            href={`tel:${customerPhone || "9999999999"}`}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition"
          >
            <Phone className="w-4 h-4" /> Call Customer
          </a>
        )}
      </div>
    </div>
  );
}

