"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setCredentials, logout } from "@/store/slices/authSlice";
import { api } from "@/lib/axios";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsReady(true);
      return;
    }

    // Token found — validate it and restore user session
    api
      .get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const user = res.data?.data;
        if (user) {
          dispatch(setCredentials({ user, token }));
        } else {
          localStorage.removeItem("token");
          dispatch(logout());
        }
      })
      .catch(() => {
        // Token is expired or invalid — clear it
        localStorage.removeItem("token");
        dispatch(logout());
      })
      .finally(() => {
        setIsReady(true);
      });
  }, [dispatch]);

  // Show a fullscreen loader while restoring session
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-red-600 text-white p-2 rounded-lg font-bold text-2xl leading-none">P</div>
            <span className="font-bold text-3xl tracking-tight text-gray-900">
              PRO<span className="text-red-600">-</span>LICIOUS
            </span>
          </div>
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent"></div>
          <p className="text-gray-400 text-sm font-medium">Restoring your session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
