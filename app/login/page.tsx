"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/slices/authSlice";
import { api } from "@/lib/axios";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Step 1: Login and get accessToken
      const res = await api.post("/api/auth/login", { email, password });
      const { accessToken, role } = res.data.data;

      // Step 2: Store token so /me call is authenticated
      if (typeof window !== "undefined") localStorage.setItem("token", accessToken);

      // Step 3: Fetch full user profile
      const meRes = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const user = meRes.data.data;

      // Step 4: Save to Redux
      dispatch(setCredentials({ user, token: accessToken }));

      // Step 5: Route based on role
      switch (role) {
        case "SUPER_ADMIN":
        case "ADMIN":
          router.push("/admin-dashboard");
          break;
        case "VENDOR":
          router.push("/vendor-dashboard");
          break;
        case "RIDER":
          router.push("/rider-dashboard");
          break;
        case "CUSTOMER":
        default:
          router.push("/");
          break;
      }
    } catch (err: any) {
      console.error(err);
      if (typeof window !== "undefined") localStorage.removeItem("token");
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left side - Banner */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black items-center justify-center">
        <div className="absolute inset-0 bg-red-900/40 z-10 mix-blend-multiply"></div>
        <img 
          src="https://images.unsplash.com/photo-1607006411061-0b5c1fb981f4?q=80&w=2000&auto=format&fit=crop" 
          alt="Premium Meat" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="relative z-20 text-center px-12">
          <div className="flex justify-center items-center gap-2 mb-6">
            <div className="bg-red-600 text-white p-2 rounded-lg font-bold text-3xl leading-none shadow-lg">P</div>
            <span className="font-bold text-4xl tracking-tight text-white drop-shadow-md">
              PRO<span className="text-red-500">-</span>LICIOUS
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Premium Fresh Meat Delivery</h2>
          <p className="text-gray-200 text-lg">Your neighborhood butcher shop, now completely digital. Delivering farm-fresh cuts directly to your doorstep.</p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-500">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-gray-700">Password</label>
                <a href="#" className="text-xs font-semibold text-red-600 hover:text-red-500">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
            >
              {isLoading ? "Signing in..." : "Sign In"} <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-100 pt-8">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-4">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 text-left">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 block mb-1">Customer</span>
                john@example.com
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 block mb-1">Vendor</span>
                vendor@example.com
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 block mb-1">Admin</span>
                admin@example.com
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 block mb-1">Rider</span>
                rider@example.com
              </div>
            </div>
            <p className="text-xs text-red-500 font-medium mt-3 italic">Password for all: password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
