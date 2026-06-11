"use client";

import React from "react";

type Earnings = {
  totalEarnings: number;
  count: number;
  distance?: string;
};

type RiderStatsProps = {
  earnings: Earnings | null;
};

const RiderStats: React.FC<RiderStatsProps> = ({ earnings }) => {
  const total = earnings?.totalEarnings || 0;
  const count = earnings?.count || 0;
  const distance = earnings?.distance || "0";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
      <div>
        <p className="text-xs uppercase text-gray-500">Earnings</p>
        <p className="text-3xl font-bold text-gray-900">${total}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase text-gray-500">Deliveries</p>
          <p className="text-xl font-bold text-gray-900">{count}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Distance</p>
          <p className="text-xl font-bold text-gray-900">{distance} km</p>
        </div>
      </div>
    </div>
  );
};

export default RiderStats;
