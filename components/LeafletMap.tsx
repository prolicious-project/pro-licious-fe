"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

export interface LeafletMapProps {
  riderPosition: [number, number] | null;
  vendorPosition: [number, number] | null;
  customerPosition: [number, number] | null;
  className?: string;
}

// Dynamically load the Leaflet Map Inner component with ssr: false
const MapInner = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center border border-gray-800 rounded-2xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">Loading Live Map...</span>
      </div>
    </div>
  ),
});

export default function LeafletMap(props: LeafletMapProps) {
  // Pre-fetch/load leaflet CSS on mount
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha255-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return <MapInner {...props} />;
}
