import { MapPin, Search, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

export default function Header() {
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-red-600 text-white p-2 rounded-lg font-bold text-xl leading-none">
              P
            </div>
            <span className="font-bold text-2xl tracking-tight text-gray-900">
              PRO<span className="text-red-600">-</span>LICIOUS
            </span>
          </Link>

          {/* Location & Search */}
          <div className="hidden md:flex items-center gap-6 flex-1 max-w-2xl px-8">
            <div className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer whitespace-nowrap">
              <MapPin className="w-4 h-4 text-red-600" />
              <span className="font-medium truncate max-w-[150px]">Deliver to: Mumbai, 400001</span>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search for Chicken, Mutton, Fish or Vendors..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <Link href="/orders" className="text-sm font-bold text-gray-600 hover:text-red-600 transition-colors hidden sm:block">
              My Orders
            </Link>
            <Link href="/cart" className="relative text-gray-600 hover:text-red-600 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {cartItemCount}
                </span>
              )}
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-red-600 transition-colors">
              <User className="w-6 h-6" />
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}
