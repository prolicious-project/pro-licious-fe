import Link from "next/link";
import { Globe, Heart, Link as LinkIcon } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-300 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-red-600 text-white p-1.5 rounded font-bold text-lg leading-none">
                P
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                PRO<span className="text-red-600">-</span>LICIOUS
              </span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Your neighborhood butcher shop, now digital. Delivering the freshest meat and seafood directly to your doorstep with love and care.
            </p>
            <div className="flex gap-4">
              <a href="#" className="bg-zinc-800 p-2 rounded-full hover:bg-red-600 hover:text-white transition-all"><Globe className="w-4 h-4" /></a>
              <a href="#" className="bg-zinc-800 p-2 rounded-full hover:bg-red-600 hover:text-white transition-all"><Heart className="w-4 h-4" /></a>
              <a href="#" className="bg-zinc-800 p-2 rounded-full hover:bg-red-600 hover:text-white transition-all"><LinkIcon className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/about" className="hover:text-red-500 transition-colors">About Us</Link></li>
              <li><Link href="/farmers" className="hover:text-red-500 transition-colors">Our Farmers</Link></li>
              <li><Link href="/sustainability" className="hover:text-red-500 transition-colors">Sustainability</Link></li>
              <li><Link href="/careers" className="hover:text-red-500 transition-colors">Careers</Link></li>
              <li><Link href="/vendor/register" className="text-red-500 hover:text-red-400 font-medium transition-colors">Partner with us</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-6">Support</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/help" className="hover:text-red-500 transition-colors">Help Center</Link></li>
              <li><Link href="/shipping" className="hover:text-red-500 transition-colors">Shipping & Returns</Link></li>
              <li><Link href="/privacy" className="hover:text-red-500 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-red-500 transition-colors">Terms of Service</Link></li>
              <li><Link href="/bulk-orders" className="hover:text-red-500 transition-colors">Bulk Orders</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-semibold mb-6">Newsletter</h4>
            <p className="text-sm text-zinc-400 mb-4">Get the latest news on fresh arrivals and exclusive flash sales.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email Address"
                className="bg-zinc-800 border-none rounded px-4 py-2 text-sm w-full focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors font-medium">
                →
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <p>© 2024 Pro-Licious Meat Platform. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
            <Link href="/legal" className="hover:text-white transition-colors">Legal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
