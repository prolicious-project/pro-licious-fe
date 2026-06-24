"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import { logout } from "@/store/slices/authSlice";
import { api } from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import {
  LayoutDashboard,
  Navigation,
  Wallet,
  ClipboardList,
  UserCircle,
  Menu,
  X,
  LogOut,
  Zap,
  CheckCircle,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector(
    (state: RootState) => state.auth
  );

  const [isOnline, setIsOnline] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Load and apply theme setting on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("rider-theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("rider-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("rider-theme", "light");
    }
  };

  // Authentication guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Fetch online status & active order info
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchStatus = async () => {
      try {
        const [ordersRes, summaryRes] = await Promise.all([
          api.get("/api/rider/orders"),
          api.get("/api/rider/earnings/summary"),
        ]);
        const orders = ordersRes.data?.data || [];
        const active = orders.find(
          (o: any) => !["DELIVERED", "REJECTED"].includes(o.status)
        );
        setHasActiveOrder(!!active);
      } catch (err) {
        console.error("Layout status fetch error:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, pathname]);

  // Socket connection
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = getSocket(token);
    socket.connect();

    socket.on("rider_assigned", () => {
      setHasActiveOrder(true);
    });

    socket.on("order_status_changed", (payload: any) => {
      if (["DELIVERED", "REJECTED"].includes(payload.status)) {
        setHasActiveOrder(false);
      } else {
        setHasActiveOrder(true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  const handleToggleOnline = async () => {
    try {
      await api.patch("/api/rider/availability", { isOnline: !isOnline });
      setIsOnline(!isOnline);
    } catch (err) {
      console.error("Toggle online error:", err);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-500"></div>
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/rider-dashboard", icon: LayoutDashboard },
    ...(hasActiveOrder
      ? [{ name: "Live Tracking", href: "/rider-dashboard/track", icon: Navigation }]
      : []),
    { name: "Earnings", href: "/rider-dashboard/earnings", icon: Wallet },
    { name: "Order History", href: "/rider-dashboard/history", icon: ClipboardList },
    { name: "Profile", href: "/rider-dashboard/profile", icon: UserCircle },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200">
      {/* Branding */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-red-900/40">
          P
        </div>
        <div>
          <span className="font-extrabold text-lg text-white tracking-wider">
            PRO-<span className="text-red-500">LICIOUS</span>
          </span>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            Rider Console
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/rider-dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : "text-gray-400 hover:bg-gray-800/60 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-800 space-y-3 bg-gray-950/40">
        {/* User Info */}
        <div className="px-2 py-1 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-red-500 border border-gray-700">
            {user?.name?.[0] || "R"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Theme Toggle Mode */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800/40 border border-gray-800 rounded-xl">
          <div className="flex items-center gap-2">
            {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />}
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
              {isDarkMode ? "Dark Theme" : "Light Theme"}
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
              isDarkMode ? "bg-red-600" : "bg-gray-600"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                isDarkMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Online/Offline Toggle */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800/40 border border-gray-800 rounded-xl">
          <div className="flex items-center gap-2">
            <Zap
              className={`w-4 h-4 ${
                isOnline ? "text-green-500 animate-pulse" : "text-gray-500"
              }`}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <button
            onClick={handleToggleOnline}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
              isOnline ? "bg-green-500" : "bg-gray-600"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                isOnline ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-800 hover:bg-red-900/20 hover:border-red-900/40 hover:text-red-400 text-gray-400 font-bold text-xs transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-250">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 h-screen border-r border-gray-200 dark:border-gray-800">
        <SidebarContent />
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-250">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-md">
              P
            </div>
            <span className="font-extrabold text-sm text-gray-900 dark:text-white tracking-wider">
              PRO-<span className="text-red-500">LICIOUS</span>
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Mobile Sidebar overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-64 max-w-sm flex-1 flex flex-col bg-gray-900 shadow-2xl">
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-250">
          {children}
        </main>
      </div>
    </div>
  );
}
