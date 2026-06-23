"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, ChevronRight, ChevronLeft, Clock, Star, ShieldCheck, Zap, Award, Heart, Sparkles, Flame, Percent } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/axios";
import { customerApi } from "@/services/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const VENDOR_IMGS = [
  "https://images.unsplash.com/photo-1607006411061-0b5c1fb981f4?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1553163147-622ab57be1c7?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516467508483-a7212febe31a?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?q=80&w=600&auto=format&fit=crop",
];
const CATEGORY_IMGS = [
  "https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1628268909376-e8c4dfedb180?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?q=80&w=300&auto=format&fit=crop",
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
  const categoryScrollRef = useRef<HTMLDivElement>(null);
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

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const { scrollLeft, clientWidth } = categoryScrollRef.current;
      const scrollAmount = clientWidth * 0.6;
      categoryScrollRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-gray-900 selection:bg-red-600 selection:text-white">
      <Header />
      <main className="flex-grow">
        
        {/* HERO SECTION */}
        <section className="relative w-full h-[520px] flex items-center justify-center overflow-hidden bg-black">
          {/* Background image & gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/70 to-zinc-950/90 z-10"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center z-0 scale-105" 
            style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=2000&auto=format&fit=crop")' }}
          ></div>
          
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] z-10"></div>

          <div className="relative z-20 w-full max-w-4xl mx-auto px-6 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Premium Freshness Guaranteed
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight">
              Farm-Fresh Cuts,<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-rose-400">
                Delivered in Minutes.
              </span>
            </h1>
            
            <p className="text-zinc-300 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              We connect you with certified local butchers offering 100% traceably fresh meat, cleaned and delivered under strict temperature control.
            </p>

            <div className="bg-white p-2 rounded-2xl sm:rounded-full flex flex-col sm:flex-row items-stretch sm:items-center shadow-2xl max-w-2xl mx-auto border border-gray-100 gap-2 mt-4">
              <div className="flex items-center flex-1 px-3">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search chicken, premium steaks, local fish..."
                  className="w-full bg-transparent border-none outline-none px-3 py-2.5 text-gray-800 placeholder-gray-500 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-8 py-3 rounded-xl sm:rounded-full font-bold text-sm transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                {searchLoading ? "Searching..." : "Explore Menu"}
              </button>
            </div>
          </div>
        </section>

        {/* SEARCH RESULTS VIEW */}
        {searchResults !== null && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Search Results
                </h2>
                <p className="text-xs text-gray-500 mt-1">Showing matches for &quot;{searchQuery}&quot;</p>
              </div>
              <button 
                onClick={() => { setSearchResults(null); setSearchQuery(""); }}
                className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Clear Results &times;
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <p className="text-gray-500 font-bold">No matching products or vendors found.</p>
                <p className="text-xs text-gray-400 mt-1">Check the spelling or try searching generic terms like Mutton, Vendor, etc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {searchResults.map((result: any, i: number) => (
                  <Link href={`/vendor/${result.id || result.vendorId || "#"}`} key={i} className="group">
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300">
                      <div className="relative h-44 overflow-hidden bg-gray-100">
                        <img 
                          src={VENDOR_IMGS[i % VENDOR_IMGS.length]} 
                          alt={result.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                        />
                      </div>
                      <div className="p-5">
                        <h3 className="font-extrabold text-gray-900 group-hover:text-red-600 transition-colors text-base line-clamp-1">{result.name}</h3>
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{result.description || result.email || "Premium partner store"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PROMOTION / CAROUSEL OFFERS SECTION */}
        {searchResults === null && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Promo Card 1 */}
              <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-red-900 to-red-600 p-6 sm:p-8 text-white flex flex-col justify-between h-[180px] shadow-lg shadow-red-900/10">
                <div className="absolute right-4 bottom-0 w-36 h-36 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-400/20 rounded-full blur-xl pointer-events-none" />
                <div>
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase rounded">Limited Offer</span>
                  <h3 className="text-xl sm:text-2xl font-black mt-2 leading-tight">Get 20% Cashback <br />On First Order</h3>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-lg border border-white/10 text-xs font-mono font-bold">
                    Code: <span className="text-yellow-300 font-extrabold">FIRST20</span>
                  </div>
                  <span className="text-xs font-bold underline flex items-center gap-1">Order Now <ChevronRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>

              {/* Promo Card 2 */}
              <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-zinc-900 to-zinc-850 p-6 sm:p-8 text-white flex flex-col justify-between h-[180px] shadow-lg shadow-zinc-900/10 border border-zinc-800">
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-15">
                  <Flame className="w-28 h-28 text-red-500" />
                </div>
                <div>
                  <span className="px-2 py-0.5 bg-red-600 text-[10px] font-bold tracking-widest uppercase rounded">Special Launch</span>
                  <h3 className="text-xl sm:text-2xl font-black mt-2 leading-tight">Gourmet Ribeye Steak <br />Fresh Arrivals</h3>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-zinc-400 font-medium">Antibiotic-free local meats</span>
                  <span className="text-xs font-bold text-red-500 hover:text-red-400 transition flex items-center gap-1">Browse Steaks <ChevronRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* CATEGORIES SECTION */}
        {searchResults === null && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Explore Categories</h2>
                <p className="text-xs text-gray-500 mt-0.5">Pick from our premium selections</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => scrollCategories("left")}
                  className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition shadow-sm cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => scrollCategories("right")}
                  className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition shadow-sm cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div 
              ref={categoryScrollRef}
              className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide snap-x"
            >
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 min-w-[120px] animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-gray-200"></div>
                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                  </div>
                ))
              ) : categories.length > 0 ? (
                categories.map((cat: any, idx: number) => (
                  <div key={cat.id} className="flex flex-col items-center gap-3 min-w-[120px] group cursor-pointer snap-start">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md group-hover:shadow-xl group-hover:border-red-500/20 group-hover:ring-4 group-hover:ring-red-100 transition-all duration-300">
                      <img 
                        src={cat.imageUrl || CATEGORY_IMGS[idx % CATEGORY_IMGS.length]} 
                        alt={cat.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-800 group-hover:text-red-600 transition-colors text-center">{cat.name}</span>
                  </div>
                ))
              ) : (
                ["Chicken", "Mutton", "Sea Food", "Eggs", "Cold Cuts", "Ready to Cook"].map((name, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 min-w-[120px] group cursor-pointer snap-start">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md group-hover:shadow-xl group-hover:border-red-500/20 group-hover:ring-4 group-hover:ring-red-100 transition-all duration-300">
                      <img 
                        src={CATEGORY_IMGS[i]} 
                        alt={name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-800 group-hover:text-red-600 transition-colors text-center">{name}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* VENDORS SECTION */}
        {searchResults === null && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Trusted Vendors Near You</h2>
                <p className="text-xs text-gray-500 mt-0.5">Top-rated certified partner stores delivering locally</p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-150 shadow-sm animate-pulse">
                    <div className="h-44 bg-gray-250"></div>
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-250 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-250 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-200 rounded-3xl p-8">
                <p className="text-gray-400 font-bold">No certified vendors online in your local area right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {vendors.map((vendor, i) => (
                  <Link href={`/vendor/${vendor.id}`} key={vendor.id} className="group block">
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300">
                      <div className="relative h-44 overflow-hidden">
                        <img 
                          src={vendor.logoUrl || VENDOR_IMGS[i % VENDOR_IMGS.length]} 
                          alt={vendor.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                        />
                        
                        {/* Time tag */}
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-800 flex items-center gap-1 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-red-500" /> 25-45 MINS
                        </div>
                        
                        {/* Tags */}
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(vendor.id); }}
                            className={`p-2 rounded-full shadow-sm bg-white/90 backdrop-blur-sm transition-all cursor-pointer ${favorites.has(vendor.id) ? "bg-red-500 text-white" : "text-gray-600 hover:text-red-500"}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${favorites.has(vendor.id) ? "fill-current" : ""}`} />
                          </button>
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${vendor.status === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-zinc-650 text-white'}`}>
                            {vendor.status === 'ACTIVE' ? 'OPEN' : 'CLOSED'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h3 className="font-extrabold text-base text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">{vendor.name}</h3>
                          <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-current" /> {vendor.rating || "4.8"}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mb-4 line-clamp-2 min-h-8 leading-relaxed">{vendor.description || vendor.email}</p>
                        
                        <div className="flex gap-3 text-[10px] uppercase font-bold text-zinc-400 border-t border-zinc-100 pt-3.5">
                          <span className="flex items-center gap-1 flex-1 truncate"><ShieldCheck className="w-3.5 h-3.5 text-red-500" /> FSSAI Approved</span>
                          <span className="flex items-center gap-1 text-right"><Percent className="w-3.5 h-3.5 text-emerald-500" /> Best Price</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TRUST BADGES SECTION */}
        <section className="bg-zinc-950 py-16 border-t border-zinc-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px] z-0" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { icon: <Zap className="w-6 h-6 text-red-500" />, title: "Instant Delivery", sub: "Under 45 mins local delivery" },
                { icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />, title: "FSSAI Hygienic", sub: "Strictly temperature-controlled" },
                { icon: <Award className="w-6 h-6 text-amber-500" />, title: "Premium Cuts", sub: "Antibiotic-free organic meats" },
                { icon: <Star className="w-6 h-6 text-indigo-400" />, title: "Best in Market", sub: "Rated 4.8+ by thousands" },
              ].map((badge, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/60 shadow-sm">
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex-shrink-0">{badge.icon}</div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-zinc-150">{badge.title}</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">{badge.sub}</p>
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
