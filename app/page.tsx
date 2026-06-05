"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, ChevronRight, ChevronLeft, Clock, Star, ShieldCheck, Zap, Award, Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/axios";
import { customerApi } from "@/services/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const VENDOR_IMGS = [
  "https://images.unsplash.com/photo-1607006411061-0b5c1fb981f4?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1553163147-622ab57be1c7?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516467508483-a7212febe31a?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?q=80&w=400&auto=format&fit=crop",
];

const CATEGORY_IMGS = [
  "https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1628268909376-e8c4dfedb180?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?q=80&w=200&auto=format&fit=crop",
];

export default function Home() {
  const { isAuthenticated } = useAuthGuard();
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      customerApi.getVendors(),
      customerApi.getCategories(),
    ])
      .then(([vendorsRes, catsRes]) => {
        if (vendorsRes.data?.data) setVendors(vendorsRes.data.data);
        if (catsRes.data?.data) setCategories(catsRes.data.data);
      })
      .catch(err => console.warn("Could not fetch data:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const res = await customerApi.search(searchQuery);
      setSearchResults(res.data?.data || []);
    } catch (e) {
      console.warn("Search error:", e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  const toggleFavorite = async (vendorId: number) => {
    try {
      if (favorites.has(vendorId)) {
        await customerApi.removeFavorite(vendorId);
        setFavorites(prev => { const s = new Set(prev); s.delete(vendorId); return s; });
      } else {
        await customerApi.addFavorite(vendorId);
        setFavorites(prev => new Set(prev).add(vendorId));
      }
    } catch (e) { console.warn("Favorite toggle error:", e); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow">
        {/* HERO */}
        <section className="relative w-full h-[500px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=2000&auto=format&fit=crop")' }}></div>
          <div className="relative z-20 w-full max-w-4xl mx-auto px-4 text-center">
            <span className="text-red-500 font-bold tracking-wider uppercase text-sm mb-4 block">Premium Fresh Meat Delivery</span>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg">
              Fresh Cuts,<br /><span className="text-red-500">Perfectly</span> Delivered.
            </h1>
            <div className="bg-white p-2 rounded-full flex items-center shadow-2xl max-w-2xl mx-auto">
              <Search className="w-6 h-6 text-gray-400 ml-4" />
              <input
                type="text"
                placeholder="Search for Chicken, Mutton, Fish or Vendors..."
                className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-gray-800 placeholder-gray-500 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold transition-colors"
              >
                {searchLoading ? "..." : "Find Food"}
              </button>
            </div>
          </div>
        </section>

        {/* SEARCH RESULTS */}
        {searchResults !== null && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Search Results for &quot;{searchQuery}&quot;
              </h2>
              <button onClick={() => { setSearchResults(null); setSearchQuery(""); }}
                className="text-sm font-medium text-red-600 hover:text-red-700">Clear Search</button>
            </div>
            {searchResults.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-medium">No results found.</p>
                <p className="text-sm mt-2">Try searching for something else.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {searchResults.map((result: any, i: number) => (
                  <Link href={`/vendor/${result.id || result.vendorId || "#"}`} key={i} className="group block">
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        <img src={VENDOR_IMGS[i % VENDOR_IMGS.length]} alt={result.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-lg text-gray-900">{result.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{result.description || result.email || ""}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* CATEGORIES from API */}
        {searchResults === null && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900">Explore by Category</h2>
              <div className="flex gap-2">
                <button className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
                <button className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex overflow-x-auto pb-6 gap-8">
              {loading ? (
                [1,2,3,4,5,6].map(i => (
                  <div key={i} className="flex flex-col items-center gap-4 min-w-[100px] animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-gray-200"></div>
                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                  </div>
                ))
              ) : categories.length > 0 ? (
                categories.map((cat: any, idx: number) => (
                  <div key={cat.id} className="flex flex-col items-center gap-4 min-w-[100px] group cursor-pointer">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg group-hover:border-red-100 group-hover:shadow-xl transition-all">
                      <img src={cat.imageUrl || CATEGORY_IMGS[idx % CATEGORY_IMGS.length]} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-red-600 transition-colors text-center">{cat.name}</span>
                  </div>
                ))
              ) : (
                // Fallback hardcoded categories if API returns empty
                ["Chicken", "Mutton", "Sea Food", "Eggs", "Cold Cuts", "Ready to Cook"].map((name, i) => (
                  <div key={i} className="flex flex-col items-center gap-4 min-w-[100px] group cursor-pointer">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg group-hover:border-red-100 group-hover:shadow-xl transition-all">
                      <img src={CATEGORY_IMGS[i]} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-red-600 transition-colors text-center">{name}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* VENDORS FROM API */}
        {searchResults === null && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendors Near You</h2>
                <p className="text-gray-500">The most trusted local butchers in your area</p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-medium">No vendors found in your area yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {vendors.map((vendor, i) => (
                  <Link href={`/vendor/${vendor.id}`} key={vendor.id} className="group block">
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                      <div className="relative h-48 overflow-hidden">
                        <img src={vendor.logoUrl || VENDOR_IMGS[i % VENDOR_IMGS.length]} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-gray-800 flex items-center gap-1 shadow-sm">
                          <Clock className="w-3 h-3 text-red-500" /> 25-40 min
                        </div>
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(vendor.id); }}
                            className={`p-1.5 rounded-full shadow-sm transition-all ${favorites.has(vendor.id) ? "bg-red-500 text-white" : "bg-white/90 text-gray-600 hover:text-red-500"}`}
                          >
                            <Heart className={`w-4 h-4 ${favorites.has(vendor.id) ? "fill-current" : ""}`} />
                          </button>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${vendor.status === 'ACTIVE' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                            {vendor.status === 'ACTIVE' ? 'OPEN' : 'CLOSED'}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">{vendor.name}</h3>
                          <div className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" /> {vendor.rating || "4.8"}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-1">{vendor.description || vendor.email}</p>
                        <div className="flex gap-2 text-[10px] uppercase font-bold text-gray-400 border-t border-gray-100 pt-3">
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> FSSAI Certified</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Fresh Daily</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TRUST BADGES */}
        <section className="bg-gray-50 py-12 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { icon: <Zap className="w-6 h-6" />, title: "Flash Delivery", sub: "Within 45 mins" },
                { icon: <ShieldCheck className="w-6 h-6" />, title: "FSSAI Certified", sub: "100% safe & hygienic" },
                { icon: <Award className="w-6 h-6" />, title: "Chef Selected", sub: "Hand-picked cuts" },
                { icon: <Star className="w-6 h-6" />, title: "Top Rated", sub: "Loved by 50k+ customers" },
              ].map((b, i) => (
                <div key={i} className="flex items-center justify-center gap-4">
                  <div className="bg-red-100 p-3 rounded-full text-red-600">{b.icon}</div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{b.title}</h4>
                    <p className="text-xs text-gray-500">{b.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
