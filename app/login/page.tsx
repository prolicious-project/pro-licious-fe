"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/slices/authSlice";
import { api } from "@/lib/axios";
import { authApi } from "@/services/api";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, AlertCircle, Phone, User, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [signInMethod, setSignInMethod] = useState<"email" | "phone">("email");
  
  // Sign In (Email) State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Sign Up / Sign In (Phone) State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { accessToken, role } = res.data.data;

      if (typeof window !== "undefined") localStorage.setItem("token", accessToken);

      const meRes = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const user = meRes.data.data;

      dispatch(setCredentials({ user, token: accessToken }));

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Name is only required for signup
    if (activeTab === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setSuccess("");
    
    try {
      await authApi.sendOtp(phone);
      setIsOtpSent(true);
      setSuccess("Verification code sent to your phone number.");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      const res = await authApi.verifyOtp({
        phone,
        otp,
        name: activeTab === "signup" ? name : undefined,
        role: "CUSTOMER"
      });
      const { accessToken, role } = res.data.data;

      if (typeof window !== "undefined") localStorage.setItem("token", accessToken);

      const meRes = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const user = meRes.data.data;

      dispatch(setCredentials({ user, token: accessToken }));
      setSuccess(activeTab === "signup" ? "Account verified successfully! Redirecting..." : "Logged in successfully! Redirecting...");
      
      setTimeout(() => {
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
      }, 1000);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || "";
      if (activeTab === "signin" && msg.includes("Name required for signup")) {
        setError("This phone number is not registered. Please use the Sign Up tab to create an account first.");
      } else {
        setError(msg || "Invalid OTP verification code.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPhoneFlow = () => {
    setIsOtpSent(false);
    setOtp("");
    setSuccess("");
    setError("");
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
          
          {/* Tabs header */}
          <div className="flex items-center gap-2 p-1 bg-zinc-950/80 border border-zinc-800 rounded-2xl mb-8">
            <button
              onClick={() => { setActiveTab("signin"); setSignInMethod("email"); handleResetPhoneFlow(); }}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                activeTab === "signin"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab("signup"); handleResetPhoneFlow(); }}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                activeTab === "signup"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-black tracking-tight text-white">
              {activeTab === "signin" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              {activeTab === "signin" 
                ? "Sign in to access your platform dashboard" 
                : "Sign up as a customer using your phone number"}
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

          {/* SIGN IN VIEW */}
          {activeTab === "signin" && (
            <div className="space-y-6">
              {/* Sign In Method Switcher */}
              <div className="flex gap-2 p-1 bg-zinc-950/40 border border-zinc-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setSignInMethod("email"); handleResetPhoneFlow(); }}
                  className={`flex-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition ${
                    signInMethod === "email"
                      ? "bg-zinc-850 text-white border border-zinc-800"
                      : "text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  Email & Password
                </button>
                <button
                  type="button"
                  onClick={() => { setSignInMethod("phone"); handleResetPhoneFlow(); }}
                  className={`flex-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition ${
                    signInMethod === "phone"
                      ? "bg-zinc-850 text-white border border-zinc-800"
                      : "text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  Phone & OTP
                </button>
              </div>

              {signInMethod === "email" ? (
                /* Email/Password Sign In Form */
                <form onSubmit={handleLogin} className="space-y-5">
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
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                      <a href="#" className="text-[10px] font-bold text-red-500 hover:text-red-400">Forgot password?</a>
                    </div>
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
                    className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-50 shadow-lg shadow-red-600/10 cursor-pointer"
                  >
                    {isLoading ? "Signing in..." : "Sign In"} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Phone/OTP Sign In Form */
                <div className="space-y-5">
                  {!isOtpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-5">
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

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-50 shadow-lg shadow-red-600/10 cursor-pointer"
                      >
                        {isLoading ? "Sending OTP..." : "Send Verification Code"} <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Verification Code (6-digit OTP)</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                            className="block w-full py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-bold text-center placeholder-zinc-650 focus:outline-none focus:border-red-500 text-lg tracking-[0.5em] transition"
                            placeholder="000000"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 font-medium text-center mt-2">
                          Code sent to <span className="text-zinc-300 font-bold">{phone}</span>
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleResetPhoneFlow}
                          className="flex-1 py-3 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading || otp.length < 6}
                          className="flex-[2] py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shadow-lg shadow-red-600/10 cursor-pointer"
                        >
                          {isLoading ? "Verifying..." : "Verify & Sign In"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SIGN UP VIEW */}
          {activeTab === "signup" && (
            <div className="space-y-5">
              {!isOtpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-5">
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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-50 shadow-lg shadow-red-600/10 cursor-pointer"
                  >
                    {isLoading ? "Sending OTP..." : "Send Verification Code"} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Verification Code (6-digit OTP)</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="block w-full py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-bold text-center placeholder-zinc-650 focus:outline-none focus:border-red-500 text-lg tracking-[0.5em] transition"
                        placeholder="000000"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium text-center mt-2">
                      Code sent to <span className="text-zinc-300 font-bold">{phone}</span>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleResetPhoneFlow}
                      className="flex-1 py-3 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || otp.length < 6}
                      className="flex-[2] py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shadow-lg shadow-red-600/10 cursor-pointer"
                    >
                      {isLoading ? "Verifying..." : "Verify & Sign Up"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Demo Accounts dropdown info */}
          <div className="mt-8 text-center border-t border-zinc-800 pt-6">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-4">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 text-left">
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="font-bold text-zinc-300 block mb-0.5">Customer</span>
                john@example.com
              </div>
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="font-bold text-zinc-300 block mb-0.5">Vendor</span>
                vendor@example.com
              </div>
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="font-bold text-zinc-300 block mb-0.5">Admin</span>
                admin@example.com
              </div>
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="font-bold text-zinc-300 block mb-0.5">Rider</span>
                rider@example.com
              </div>
            </div>
            <p className="text-[10px] text-red-500 font-bold mt-3 italic">Password for all: password123</p>
          </div>

        </div>
      </div>
    </div>
  );
}
