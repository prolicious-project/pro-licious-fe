"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Menu, BarChart3, Wallet, Settings, AlertCircle, LogOut } from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/vendor-dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/vendor-dashboard/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/vendor-dashboard/menu", icon: Menu, label: "Menu" },
  { href: "/vendor-dashboard/settlements", icon: Wallet, label: "Settlements" },
  { href: "/vendor-dashboard/settings", icon: Settings, label: "Settings" },
];

export default function VendorSidebar() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex">
      <div className="p-6 border-b border-gray-100">
        <Link href="/vendor-dashboard" className="flex items-center gap-2">
          <div className="bg-red-600 text-white p-1.5 rounded font-bold text-lg leading-none">P</div>
          <span className="font-bold text-xl tracking-tight text-gray-900">PRO<span className="text-red-600">-</span>LICIOUS</span>
        </Link>
      </div>
      <div className="flex-1 py-6 px-4 space-y-1">
        {NAV_ITEMS.map((item, i) => {
          const isActive = pathname === item.href;
          return (
            <Link key={i} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${isActive ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-gray-100">
        <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
          <h4 className="font-bold text-gray-900 text-sm mb-1">Need Support?</h4>
          <button className="w-full bg-white text-gray-900 text-xs font-bold py-2 rounded shadow-sm border border-gray-200 mt-2 hover:bg-gray-50">Contact Admin</button>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg font-medium transition-colors">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </aside>
  );
}
