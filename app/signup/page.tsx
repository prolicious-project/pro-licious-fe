"use client";

import { useState, useEffect, Suspense } from "react";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/slices/authSlice";
import { api } from "@/lib/axios";
import { authApi } from "@/services/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, User, ShieldCheck, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";

function SignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    if (phoneParam) {
      setPhone(phoneParam.replace(/\D/g, "").slice(0, 10));
    }
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await authApi.register({
        name,
        email,
        phone,
        password,
        role: "CUSTOMER",
      });
      const { accessToken } = res.data.data;

      if (typeof window !== "undefined") localStorage.setItem("token", accessToken);

      const meRes = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = meRes.data.data;

      dispatch(setCredentials({ user, token: accessToken }));
      setSuccess("Account created successfully! Redirecting...");

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to create account. Email or Phone might already be registered.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 text-white font-sans selection:bg-red-500 selection:text-white">
      {/* Left side - Premium Aesthetic Banner */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden border-r border-zinc-800 bg-black">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/60 to-transparent z-10"></div>
        <img
          src="https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=2000&auto=format&fit=crop"
          alt="Premium Meat Cuts"
          className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105 hover:scale-100 transition-all duration-700"
        />

        {/* Decorative Grid Patterns */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-10"></div>

        <div className="relative z-20 text-center px-16 max-w-xl">
          <div className="flex justify-center items-center gap-3 mb-8">
            <div className="bg-red-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-red-600/30">P</div>
            <span className="font-black text-4xl tracking-tight text-white uppercase">
              PRO<span className="text-red-500">LICIOUS</span>
            </span>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight">
            Craving Premium Quality? <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-rose-400">Perfect Cuts Delivered.</span>
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            From gourmet chops to fresh daily meats, we bridge the gap between organic farms and your kitchen table. Fresh, clean, and temperature-controlled.
          </p>
        </div>
      </div>

      {/* Right side - Forms Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-md p-8 sm:p-10 rounded-[32px] border border-zinc-800 shadow-2xl relative">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight text-white">
              Create Customer Account
            </h1>
            <p className="text-zinc-500 text-xs mt-2">
              Sign up as a new customer to order premium meats
            </p>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="mb-6 bg-emerald-500/10 text-emerald-400 p-4 rounded-2xl flex items-start gap-3 text-xs border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="font-semibold">{success}</p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-500/10 text-red-400 p-4 rounded-2xl flex items-start gap-3 text-xs border border-red-500/20">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:border-red-500 text-xs transition"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:border-red-500 text-xs transition"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="block w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:border-red-500 text-xs transition"
                  placeholder="10-digit number"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:border-red-500 text-xs transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-50 shadow-lg shadow-red-600/10 cursor-pointer mt-2"
            >
              {isLoading ? "Creating Account..." : "Create Account"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Link to login page */}
          <div className="mt-8 text-center border-t border-zinc-800 pt-6">
            <p className="text-xs text-zinc-450">
              Already have an account?{" "}
              <Link href="/login" className="text-red-500 hover:text-red-400 font-bold ml-1">
                Sign In here
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent"></div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
