"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Truck, Users, Activity, AlertTriangle, ShieldCheck, Settings, FileText, LogOut } from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { label: "Platform", type: "header" as const },
  { href: "/admin-dashboard", icon: LayoutDashboard, label: "Live Overview" },
  { href: "/admin-dashboard/orders", icon: FileText, label: "Orders" },
  { href: "/admin-dashboard/vendors", icon: Store, label: "Vendors" },
  { href: "/admin-dashboard/riders", icon: Truck, label: "Riders" },
  { label: "System", type: "header" as const },
  { href: "/admin-dashboard/analytics", icon: Activity, label: "Analytics" },
  { href: "/admin-dashboard/tickets", icon: AlertTriangle, label: "Tickets" },
  { href: "/admin-dashboard/audit-logs", icon: ShieldCheck, label: "Audit Logs" },
  { href: "/admin-dashboard/settings", icon: Settings, label: "Settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-zinc-900 text-zinc-300 border-r border-zinc-800 flex-col hidden md:flex">
      <div className="p-6 border-b border-zinc-800">
        <Link href="/admin-dashboard" className="flex items-center gap-2">
          <div className="bg-red-600 text-white p-1.5 rounded font-bold text-lg leading-none">P</div>
          <span className="font-bold text-xl tracking-tight text-white">ADMIN<span className="text-red-600">.</span></span>
        </Link>
      </div>
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          if (item.type === "header") {
            return <div key={i} className="text-xs font-bold text-zinc-500 uppercase px-3 mb-2 mt-4">{item.label}</div>;
          }
          const isActive = pathname === item.href;
          return (
            <Link key={i} href={item.href!}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${isActive ? "bg-red-600 text-white" : "hover:bg-zinc-800 hover:text-white"}`}>
              {item.icon && <item.icon className="w-5 h-5" />}
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-zinc-800">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg font-medium transition-colors">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </aside>
  );
}
