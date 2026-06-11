// "use client";

// import React from "react";
// import { Clock, CheckCircle, AlertCircle } from "lucide-react";

// type Props = {
//   orders: any[];
//   loading?: boolean;
//   onRetry?: () => void;
// };

// export default function RiderOrdersList({ orders, loading, onRetry }: Props) {
//   if (loading) {
//     return (
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
//         <div className="flex items-center justify-center gap-3">
//           <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-600 border-t-transparent"></div>
//           <span className="text-gray-600 text-sm">Loading orders...</span>
//         </div>
//       </div>
//     );
//   }

//   if (!orders || orders.length === 0) {
//     return (
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
//         <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
//         <p className="text-gray-600 font-medium">No orders yet</p>
//         <p className="text-xs text-gray-500 mt-1">Go online to receive delivery requests</p>
//       </div>
//     );
//   }

//   const getStatusIcon = (status: string) => {
//     if (status === "DELIVERED") return <CheckCircle className="w-4 h-4 text-green-600" />;
//     if (status === "REJECTED") return <AlertCircle className="w-4 h-4 text-red-600" />;
//     return <Clock className="w-4 h-4 text-yellow-600" />;
//   };

//   const getStatusStyle = (status: string) => {
//     if (status === "DELIVERED") return "bg-green-50 text-green-700";
//     if (status === "REJECTED") return "bg-red-50 text-red-700";
//     return "bg-yellow-50 text-yellow-700";
//   };

//   return (
//     <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//       <div className="px-6 py-4 border-b border-gray-200">
//         <h3 className="font-bold text-gray-900">Recent Orders ({orders.length})</h3>
//       </div>
//       <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
//         {orders.map((order) => (
//           <div key={order.id} className="px-6 py-4 hover:bg-gray-50 transition">
//             <div className="flex items-start justify-between gap-4">
//               <div className="flex-1 min-w-0">
//                 <p className="font-bold text-gray-900">Order #{order.orderNumber || order.id}</p>
//                 <p className="text-xs text-gray-600 mt-1">
//                   {new Date(order.assignedAt).toLocaleDateString()} at{" "}
//                   {new Date(order.assignedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//                 </p>
//               </div>
//               <div className="flex items-center gap-2">
//                 {getStatusIcon(order.status)}
//                 <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusStyle(order.status)}`}>
//                   {order.status.replace(/_/g, " ")}
//                 </span>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }



"use client";

import React from "react";
import { Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface Order {
  id: number;
  orderId?: number;
  orderNumber: string;
  status: string;
  assignedAt: string;
  totalAmount?: number;
  vendor?: any;
}

interface Props {
  orders: Order[];
  loading?: boolean;
  onRetry?: () => void;
}

export default function RiderOrdersList({ orders, loading, onRetry }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-600 border-t-transparent" />
          <span className="text-gray-600 text-sm font-medium">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 font-medium text-sm">No orders yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Go online to receive delivery requests
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "REJECTED":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-50 text-green-700 border border-green-200";
      case "REJECTED":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ");
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900">Recent Orders</h3>
          <p className="text-xs text-gray-600 mt-1">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* Orders List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className="px-6 py-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Order Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900">
                    {order.orderNumber || `#${order.id}`}
                  </p>
                  {order.vendor?.name && (
                    <span className="text-xs text-gray-500">
                      • {order.vendor.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {formatTime(order.assignedAt)}
                </p>
                {order.totalAmount && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    ₹{order.totalAmount}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusIcon(order.status)}
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusStyle(
                    order.status
                  )}`}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
