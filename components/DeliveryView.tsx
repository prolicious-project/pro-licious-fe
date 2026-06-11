"use client";

import React, { useState } from "react";
import { api } from "@/lib/axios";

type Props = {
  order?: any;
  onDelivered?: () => void;
};

export default function DeliveryView({ order, onDelivered }: Props) {
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const resolvedOrder = order?.order ? order.order : order;
  const orderNumber = resolvedOrder?.orderNumber || resolvedOrder?.id || "N/A";
  const status = (resolvedOrder?.status || "UNKNOWN").toString();
  const address = order?.address || resolvedOrder?.address || {};
  const phone = address?.phone || resolvedOrder?.phone || "";

  const getOrderStageIndex = (s: string) => {
    const STATUS_STEPS: Record<string, number> = {
      RIDER_ASSIGNED: 0,
      ARRIVED_VENDOR: 1,
      PICKED_UP: 2,
      ARRIVED_CUSTOMER: 3,
      DELIVERED: 4,
    };
    return STATUS_STEPS[s] !== undefined ? STATUS_STEPS[s] : -1;
  };

  const patchAction = async (action: string) => {
    if (!resolvedOrder?.id && !resolvedOrder?.orderId) return;
    const id = resolvedOrder?.id || resolvedOrder?.orderId;
    try {
      setLoading(true);
      await api.patch(`/api/rider/orders/${id}/${action}`);
      setError("");
      if (onDelivered) onDelivered();
      else window.location.reload();
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async () => {
    if (!resolvedOrder?.id && !resolvedOrder?.orderId) return;
    const id = resolvedOrder?.id || resolvedOrder?.orderId;
    try {
      setLoading(true);
      setError("");
      await api.post(`/api/rider/orders/${id}/deliver`, { otp });
      if (onDelivered) onDelivered();
      else window.location.reload();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stageIndex = getOrderStageIndex(status);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-gray-800">Delivery</h4>
          <p className="text-sm text-gray-600">
            Order: <span className="font-mono">#{orderNumber}</span>
          </p>
          <p className="text-sm text-gray-600">
            Status: <span className="font-bold">{status}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Customer</p>
          <p className="font-bold">{address?.city || address?.street || "Customer"}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[11px] font-bold mb-2">
          {["Assigned", "At Vendor", "Picked", "Arrived", "Done"].map((label, i) => (
            <div
              key={label}
              className={`text-center ${stageIndex >= i ? "text-red-600" : "text-gray-300"}`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 transition-all"
            style={{ width: `${Math.max(0, ((stageIndex + 1) / 5) * 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="mt-4">
        {/* Actions depending on status */}
        {status === "RIDER_ASSIGNED" && (
          <button
            disabled={loading}
            onClick={() => patchAction("arrived-vendor")}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold"
          >
            Arrived at Vendor
          </button>
        )}

        {status === "ARRIVED_VENDOR" && (
          <button
            disabled={loading}
            onClick={() => patchAction("picked-up")}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold"
          >
            Picked Up Items
          </button>
        )}

        {status === "PICKED_UP" && (
          <button
            disabled={loading}
            onClick={() => patchAction("arrived-customer")}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold"
          >
            Arrived at Customer
          </button>
        )}

        {status === "ARRIVED_CUSTOMER" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Delivery OTP"
                className="flex-1 border border-gray-200 px-3 py-2 rounded-lg"
              />
              <button
                disabled={loading}
                onClick={confirmDelivery}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold"
              >
                Confirm
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}

        {status === "DELIVERED" && (
          <div className="text-center text-green-600 font-bold">Delivered</div>
        )}

        <div className="mt-3 flex gap-2">
          <a
            href={`tel:${phone || "9999999999"}`}
            className="flex-1 bg-white border border-gray-200 py-2 rounded-lg text-sm text-gray-700 text-center"
          >
            Call Customer
          </a>
        </div>
      </div>
    </div>
  );
}
