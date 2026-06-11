"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/slices/authSlice";
import { api } from "@/lib/axios";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, AlertCircle, Phone, KeyRound, User, UserPlus, Edit2, RotateCw } from "lucide-react";

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<"email" | "otp">("email");
  
  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  
  // Signup additional state
  const [name, setName] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "VENDOR" | "RIDER">("CUSTOMER");
  
  // UX State
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const dispatch = useDispatch();
  const router = useRouter();

  // Resend OTP Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Unified login completion logic
  const completeLogin = async (accessToken: string, userRole: string) => {
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
    switch (userRole) {
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
  };

  // 1. Handle Email & Password Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { accessToken, role: userRole } = res.data.data;
      await completeLogin(accessToken, userRole);
    } catch (err: any) {
      console.error(err);
      if (typeof window !== "undefined") localStorage.removeItem("token");
      setError(err.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate phone number structure
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.post("/api/auth/send-otp", { phone });
      setOtpSent(true);
      setTimer(60); // 60 seconds cooldown
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Verify OTP (Normal Login)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.post("/api/auth/verify-otp", { phone, otp });
      const { accessToken, role: userRole } = res.data.data;
      await completeLogin(accessToken, userRole);
    } catch (err: any) {
      console.error(err);
      
      // If backend reports Name required for signup, trigger the registration form
      if (err.response?.data?.code === "MISSING_FIELDS" || err.response?.data?.error?.toLowerCase().includes("name required")) {
        setIsNewUser(true);
        setError("This mobile number is not registered. Please enter your details below to create an account.");
      } else {
        setError(err.response?.data?.error || "Invalid or expired OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Complete Registration (For new OTP users)
  const handleRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!name.trim() || name.length < 2) {
      setError("Please enter a name with at least 2 characters.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.post("/api/auth/verify-otp", { 
        phone, 
        otp, 
        name: name.trim(), 
        role 
      });
      const { accessToken, role: userRole } = res.data.data;
      await completeLogin(accessToken, userRole);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to complete signup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetOtpState = () => {
    setOtpSent(false);
    setIsNewUser(false);
    setOtp("");
    setName("");
    setError("");
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

      {/* Right side - Login Form Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-500">Sign in to access your dashboard</p>
          </div>

          {/* Login Method Tabs */}
          <div className="flex border-b border-gray-100 mb-6">
            <button
              type="button"
              disabled={otpSent}
              onClick={() => { setLoginMethod("email"); setError(""); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                otpSent ? "opacity-50 cursor-not-allowed" : ""
              } ${
                loginMethod === "email"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              disabled={otpSent}
              onClick={() => { setLoginMethod("otp"); setError(""); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                otpSent ? "opacity-50 cursor-not-allowed" : ""
              } ${
                loginMethod === "otp"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Mobile & OTP
            </button>
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm border ${
              isNewUser 
                ? "bg-yellow-50 text-yellow-800 border-yellow-100" 
                : "bg-red-50 text-red-600 border-red-100"
            }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Method 1: Email Login Form */}
          {loginMethod === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-6">
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
          )}

          {/* Method 2: Mobile & OTP Form */}
          {loginMethod === "otp" && (
            <div className="space-y-6">
              {/* Step 1: Input Mobile Number */}
              {!otpSent && (
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        required
                        pattern="[0-9]{10,15}"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        placeholder="9876543210"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Enter 10-15 digit number. We will send an OTP.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
                  >
                    {isLoading ? "Sending OTP..." : "Send OTP"} <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              )}

              {/* Step 2: Input OTP */}
              {otpSent && !isNewUser && (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-bold text-gray-700">Mobile Number</label>
                      <button 
                        type="button" 
                        onClick={handleResetOtpState}
                        className="text-xs font-semibold text-red-600 hover:text-red-500 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Change Number
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-300" />
                      </div>
                      <input
                        type="text"
                        disabled
                        value={phone}
                        className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-100 text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">6-Digit OTP</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors tracking-widest font-bold text-lg"
                        placeholder="••••••"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      disabled={timer > 0 || isLoading}
                      onClick={handleSendOtp}
                      className="flex-1 flex justify-center items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> 
                      {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-[2] flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
                    >
                      {isLoading ? "Verifying..." : "Verify & Sign In"} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Registration details for new phone numbers */}
              {otpSent && isNewUser && (
                <form onSubmit={handleRegisterOtp} className="space-y-6">
                  <div className="border-b border-gray-100 pb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase">Verifying Number</span>
                    <p className="font-bold text-gray-800">{phone}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Register As</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["CUSTOMER", "VENDOR", "RIDER"] as const).map((r) => (
                        <label 
                          key={r}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            role === r
                              ? "border-red-600 bg-red-50/20 text-red-600 font-bold"
                              : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100 font-semibold"
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="role" 
                            value={r}
                            checked={role === r}
                            onChange={() => setRole(r)}
                            className="sr-only"
                          />
                          <span className="text-xs">{r.charAt(0) + r.slice(1).toLowerCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleResetOtpState}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 py-3 rounded-xl font-bold text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-[2] flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-70"
                    >
                      {isLoading ? "Signing up..." : "Complete Sign Up"} <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Demo Credentials Box */}
          <div className="mt-8 text-center border-t border-gray-100 pt-8">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-4">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 text-left">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 block mb-1">Customer</span>
                john@example.com (9876543210)
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 block mb-1">Vendor</span>
                vendor@example.com (9876543211)
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 block mb-1">Admin</span>
                admin@example.com (9876543213)
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-900 block mb-1">Rider</span>
                rider@example.com (9876543212)
              </div>
            </div>
            <p className="text-xs text-red-500 font-medium mt-3 italic">Password for all: password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
