"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { Compass } from "lucide-react";

export default function TrackRedirectPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const checkActiveOrder = async () => {
      try {
        const res = await api.get("/api/rider/orders");
        const orders = res.data?.data || [];
        const active = orders.find(
          (o: any) => !["DELIVERED", "REJECTED", "COMPLETED", "CANCELLED"].includes(o.status)
        );
        if (active) {
          router.replace(`/rider-dashboard/track/${active.id}`);
        } else {
          router.replace("/rider-dashboard");
        }
      } catch (err) {
        console.error("Redirect check error:", err);
        router.replace("/rider-dashboard");
      }
    };

    checkActiveOrder();
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Compass className="w-8 h-8 text-red-500 animate-spin" />
        <span className="text-xs text-gray-500 font-semibold tracking-wider uppercase">
          Locating Active Order...
        </span>
      </div>
    </div>
  );
}
